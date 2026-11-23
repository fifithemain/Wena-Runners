create or replace function public.admin_review_marketing_application(
 p_application_id uuid,p_status text,p_admin_note text,p_actor_profile_id uuid
) returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare v_app public.marketing_partner_applications%rowtype;
begin
 if p_status not in ('approved','declined','more_information') then raise exception 'Invalid application decision'; end if;
 select * into v_app from public.marketing_partner_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 if v_app.status not in ('pending','more_information') then raise exception 'Application has already been decided'; end if;
 if p_status='approved' then
  insert into public.marketing_partner_role_grants(partner_id,role_key,status,granted_by_profile_id,terms_version,accepted_at,granted_at)
  values(v_app.partner_id,v_app.role_key,'active',p_actor_profile_id,v_app.terms_version,v_app.submitted_at,now())
  on conflict(partner_id,role_key) do update set status='active',granted_by_profile_id=excluded.granted_by_profile_id,
   granted_at=now(),suspended_at=null,revoked_at=null,reason_code=null,terms_version=excluded.terms_version,
   accepted_at=excluded.accepted_at,updated_at=now();
 end if;
 update public.marketing_partner_applications set status=p_status,review_note=nullif(left(coalesce(p_admin_note,''),1000),''),
  reviewed_at=now(),reviewed_by_profile_id=p_actor_profile_id,updated_at=now() where id=p_application_id;
 insert into public.marketing_audit_log(actor_profile_id,action,target_type,target_id,metadata)
 values(p_actor_profile_id,'application_'||p_status,'marketing_partner_application',p_application_id::text,
  jsonb_build_object('role_key',v_app.role_key,'partner_id',v_app.partner_id,'note',left(coalesce(p_admin_note,''),1000)));
 return jsonb_build_object('application_id',p_application_id,'status',p_status,'role_key',v_app.role_key);
end; $$;
revoke all on function public.admin_review_marketing_application(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_review_marketing_application(uuid,text,text,uuid) to service_role;