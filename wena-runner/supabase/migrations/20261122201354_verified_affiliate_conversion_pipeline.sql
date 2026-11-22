alter table public.marketing_attributions add column if not exists profile_id uuid references public.profiles(id) on delete set null;
create index if not exists marketing_attribution_profile_idx on public.marketing_attributions(profile_id,first_seen_at desc) where profile_id is not null;

create or replace function public.record_verified_affiliate_conversion()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_partner_id uuid; v_campaign_id uuid; v_attribution_id uuid; v_conversion_id uuid; v_rule record; v_base numeric(12,2); v_reward numeric(12,2);
begin
 if new.status<>'completed' or new.payment_status<>'paid' or new.completed_at is null or new.customer_id is null
  or (old.status='completed' and old.payment_status='paid') then return new; end if;
 if not exists(select 1 from public.marketing_feature_flags where id=true and growth_enabled=true) then return new; end if;
 select a.partner_id,a.id,l.campaign_id into v_partner_id,v_attribution_id,v_campaign_id
 from public.marketing_attributions a
 join public.marketing_tracking_links l on l.id=a.tracking_link_id and l.status='active'
 join public.marketing_partners p on p.id=a.partner_id and p.status='active'
 join public.marketing_partner_role_grants g on g.partner_id=p.id and g.role_key='affiliate' and g.status='active'
 where a.profile_id=new.customer_id and a.consented=true and a.first_seen_at>=now()-interval '30 days'
  and p.profile_id<>new.customer_id order by a.last_seen_at desc limit 1;
 if v_partner_id is null then return new; end if;
 v_base:=greatest(coalesce(new.final_budget,new.requested_budget,0),0);
 insert into public.marketing_conversions(partner_id,campaign_id,attribution_id,source_type,source_id,conversion_type,amount_zar,verified_at)
 values(v_partner_id,v_campaign_id,v_attribution_id,'job',new.id::text,'completed_paid_errand',v_base,now())
 on conflict(source_type,source_id,conversion_type) do nothing returning id into v_conversion_id;
 if v_conversion_id is null then return new; end if;
 for v_rule in select id,calculation,amount,cap_amount from public.marketing_reward_rules
  where enabled=true and role_key='affiliate' and reward_type='commission'
   and (campaign_id is null or campaign_id=v_campaign_id)
   and (effective_from is null or effective_from<=now()) and (effective_to is null or effective_to>now())
  order by campaign_id nulls last,created_at desc
 loop
  v_reward:=case when v_rule.calculation='fixed' then v_rule.amount else round(v_base*v_rule.amount/100,2) end;
  if v_rule.cap_amount is not null then v_reward:=least(v_reward,v_rule.cap_amount); end if;
  if v_reward>0 then
   insert into public.marketing_reward_ledger(partner_id,role_key,entry_type,reward_type,amount_zar,idempotency_key,source_type,source_id,description)
   values(v_partner_id,'affiliate','pending','commission',v_reward,
    'job:'||new.id::text||':affiliate:'||v_partner_id::text||':rule:'||v_rule.id::text,
    'job',new.id::text,'Verified completed and paid WENA errand');
   exit;
  end if;
 end loop;
 return new;
end; $$;
revoke all on function public.record_verified_affiliate_conversion() from public,anon,authenticated;
drop trigger if exists trg_record_verified_affiliate_conversion on public.jobs;
create trigger trg_record_verified_affiliate_conversion after update of status,payment_status,completed_at on public.jobs
for each row execute function public.record_verified_affiliate_conversion();
comment on function public.record_verified_affiliate_conversion() is
'Creates one affiliate conversion and pending commission only after a persisted errand is both paid and completed; requires consented attribution, active affiliate grant, no self-referral, and an enabled reward rule.';
