alter table public.marketing_partners
  add column if not exists payout_method text,
  add column if not exists payout_account_name text,
  add column if not exists payout_account_details text;

create or replace function public.create_marketing_payout_request(
  p_partner_id uuid,p_role_key text,p_amount_zar numeric
) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_partner public.marketing_partners%rowtype;
  v_amount numeric(12,2);
  v_balance numeric(12,2);
  v_reserved numeric(12,2);
  v_available numeric(12,2);
  v_request public.marketing_payout_requests%rowtype;
begin
  if p_role_key not in ('affiliate','creator') then raise exception 'Choose a valid Growth role'; end if;
  if p_amount_zar is null or p_amount_zar='NaN'::numeric or p_amount_zar<1 or p_amount_zar>1000000 then
    raise exception 'Payout requests must be between R1 and R1,000,000';
  end if;
  v_amount:=round(p_amount_zar,2);
  select * into v_partner from public.marketing_partners where id=p_partner_id and status='active' for update;
  if not found then raise exception 'Growth partner account is not active'; end if;
  if not exists(select 1 from public.marketing_partner_role_grants
    where partner_id=p_partner_id and role_key=p_role_key and status='active') then
    raise exception 'This Growth role is not active';
  end if;
  if nullif(trim(coalesce(v_partner.payout_method,'')),'') is null
    or nullif(trim(coalesce(v_partner.payout_account_name,'')),'') is null
    or nullif(trim(coalesce(v_partner.payout_account_details,'')),'') is null then
    raise exception 'Add your Growth payout method, account name and account details before requesting a payout';
  end if;
  select coalesce(sum(case
    when entry_type='approved' then amount_zar
    when entry_type='adjustment' then amount_zar
    when entry_type='reversal' then -abs(amount_zar)
    when entry_type='paid' and reward_type='payout' then -amount_zar
    else 0 end),0)
  into v_balance from public.marketing_reward_ledger
  where partner_id=p_partner_id and role_key=p_role_key;
  select coalesce(sum(amount_zar),0) into v_reserved
  from public.marketing_payout_requests
  where partner_id=p_partner_id and role_key=p_role_key and status in ('pending','processing');
  v_available:=round(v_balance-v_reserved,2);
  if v_amount>v_available then raise exception 'Requested amount exceeds your available Growth balance (R%)',to_char(greatest(v_available,0),'FM999999990.00'); end if;
  insert into public.marketing_payout_requests(
    partner_id,role_key,amount_zar,status,payout_method_snapshot,
    payout_account_name_snapshot,payout_account_details_snapshot
  ) values (
    p_partner_id,p_role_key,v_amount,'pending',v_partner.payout_method,
    v_partner.payout_account_name,v_partner.payout_account_details
  ) returning * into v_request;
  insert into public.marketing_audit_log(actor_profile_id,action,target_type,target_id,metadata)
  values(v_partner.profile_id,'growth_payout_requested','marketing_payout_request',v_request.id::text,
    jsonb_build_object('partner_id',p_partner_id,'role_key',p_role_key,'amount_zar',v_amount));
  return jsonb_build_object('id',v_request.id,'role_key',v_request.role_key,'amount_zar',v_request.amount_zar,'status',v_request.status,'created_at',v_request.created_at,'available_after_request',round(v_available-v_amount,2));
end; $$;

create or replace function public.admin_update_marketing_payout_request(
  p_request_id uuid,p_status text,p_reference text,p_note text,p_actor_profile_id uuid
) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_request public.marketing_payout_requests%rowtype;
  v_balance numeric(12,2);
  v_reserved numeric(12,2);
  v_available numeric(12,2);
  v_reference text:=nullif(left(trim(coalesce(p_reference,'')),120),'');
  v_note text:=nullif(left(trim(coalesce(p_note,'')),1000),'');
begin
  if p_status not in ('processing','paid','rejected') then raise exception 'Invalid payout action'; end if;
  select * into v_request from public.marketing_payout_requests where id=p_request_id for update;
  if not found then raise exception 'Payout request not found'; end if;
  if p_status='processing' then
    if v_request.status<>'pending' then raise exception 'Only pending requests can move to processing'; end if;
    update public.marketing_payout_requests set status='processing',admin_note=v_note,updated_at=now(),
      processed_by_profile_id=p_actor_profile_id where id=v_request.id returning * into v_request;
  elsif p_status='rejected' then
    if v_request.status not in ('pending','processing') then raise exception 'This payout request can no longer be rejected'; end if;
    update public.marketing_payout_requests set status='rejected',admin_note=v_note,processed_at=now(),processed_by_profile_id=p_actor_profile_id,
      updated_at=now() where id=v_request.id returning * into v_request;
  else
    if v_request.status<>'processing' then raise exception 'Move this payout request to processing before marking it paid'; end if;
    if v_reference is null then raise exception 'Enter the bank or payment reference before marking a payout paid'; end if;
    perform 1 from public.marketing_partners where id=v_request.partner_id for update;
    select coalesce(sum(case
      when entry_type='approved' then amount_zar
      when entry_type='adjustment' then amount_zar
      when entry_type='reversal' then -abs(amount_zar)
      when entry_type='paid' and reward_type='payout' then -amount_zar
      else 0 end),0)
    into v_balance from public.marketing_reward_ledger
    where partner_id=v_request.partner_id and role_key=v_request.role_key;
    select coalesce(sum(amount_zar),0) into v_reserved
    from public.marketing_payout_requests
    where partner_id=v_request.partner_id and role_key=v_request.role_key
      and status in ('pending','processing') and id<>v_request.id;
    v_available:=round(v_balance-v_reserved,2);
    if v_request.amount_zar>v_available then raise exception 'Available balance has changed; this payout cannot be settled'; end if;
    insert into public.marketing_reward_ledger(
      partner_id,role_key,entry_type,reward_type,amount_zar,idempotency_key,
      source_type,source_id,description,created_by_profile_id
    ) values (
      v_request.partner_id,v_request.role_key,'paid','payout',v_request.amount_zar,
      'marketing-payout:'||v_request.id::text,'marketing_payout_request',v_request.id::text,
      'Growth payout settled · '||v_reference,p_actor_profile_id
    ) on conflict(idempotency_key) do nothing;
    update public.marketing_payout_requests set status='paid',payout_reference=v_reference,admin_note=v_note,
      processed_at=now(),processed_by_profile_id=p_actor_profile_id,updated_at=now()
      where id=v_request.id returning * into v_request;
  end if;
  insert into public.marketing_audit_log(actor_profile_id,action,target_type,target_id,metadata)
  values(p_actor_profile_id,'growth_payout_'||p_status,'marketing_payout_request',v_request.id::text,
    jsonb_build_object('partner_id',v_request.partner_id,'role_key',v_request.role_key,'amount_zar',v_request.amount_zar,'reference',case when p_status='paid' then v_reference else null end,'note',v_note));
  return jsonb_build_object('id',v_request.id,'status',v_request.status,'payout_reference',v_request.payout_reference,'processed_at',v_request.processed_at);
end; $$;

revoke all on function public.create_marketing_payout_request(uuid,text,numeric) from public,anon,authenticated;
revoke all on function public.admin_update_marketing_payout_request(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.create_marketing_payout_request(uuid,text,numeric) to service_role;
grant execute on function public.admin_update_marketing_payout_request(uuid,text,text,text,uuid) to service_role;