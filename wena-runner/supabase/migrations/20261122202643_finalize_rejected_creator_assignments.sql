create or replace function public.admin_review_creator_deliverable(
 p_deliverable_id uuid,p_status text,p_review_note text,p_actor_profile_id uuid
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_deliverable public.marketing_creator_deliverables%rowtype; v_assignment public.marketing_campaign_assignments%rowtype;
begin
 if p_status not in ('approved','changes_requested','rejected') then raise exception 'Invalid deliverable review status'; end if;
 select * into v_deliverable from public.marketing_creator_deliverables where id=p_deliverable_id for update;
 if not found then raise exception 'Deliverable not found'; end if;
 if v_deliverable.status not in ('submitted','changes_requested') then raise exception 'Deliverable is not awaiting review'; end if;
 select * into v_assignment from public.marketing_campaign_assignments where id=v_deliverable.assignment_id for update;
 if not found then raise exception 'Creator assignment not found'; end if;
 update public.marketing_creator_deliverables set status=p_status,review_note=nullif(left(coalesce(p_review_note,''),1000),''),
  reviewed_by_profile_id=p_actor_profile_id,reviewed_at=now() where id=p_deliverable_id;
 if p_status='approved' then
  update public.marketing_campaign_assignments set status='completed',completed_at=now() where id=v_assignment.id;
  if v_assignment.agreed_fee_zar>0 then
   insert into public.marketing_reward_ledger(partner_id,role_key,entry_type,reward_type,amount_zar,idempotency_key,source_type,source_id,description)
   values(v_assignment.partner_id,'creator','pending','creator_fee',v_assignment.agreed_fee_zar,
    'deliverable:'||p_deliverable_id::text||':creator_fee','creator_deliverable',p_deliverable_id::text,'Approved creator campaign deliverable')
   on conflict(idempotency_key) do nothing;
  end if;
 elsif p_status='changes_requested' then
  update public.marketing_campaign_assignments set status='in_progress' where id=v_assignment.id;
 else
  update public.marketing_campaign_assignments set status='cancelled' where id=v_assignment.id;
 end if;
 insert into public.marketing_audit_log(actor_profile_id,action,target_type,target_id,metadata)
 values(p_actor_profile_id,'creator_deliverable_'||p_status,'marketing_creator_deliverable',p_deliverable_id::text,
  jsonb_build_object('assignment_id',v_assignment.id,'partner_id',v_assignment.partner_id,'agreed_fee_zar',v_assignment.agreed_fee_zar,'note',left(coalesce(p_review_note,''),1000)));
 return jsonb_build_object('deliverable_id',p_deliverable_id,'status',p_status,'partner_id',v_assignment.partner_id);
end; $$;
revoke all on function public.admin_review_creator_deliverable(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_review_creator_deliverable(uuid,text,text,uuid) to service_role;