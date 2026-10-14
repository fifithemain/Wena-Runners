-- Keep payout ledger precision consistent with payout requests.
alter table public.payouts
  alter column amount type numeric(12,2)
  using amount::numeric(12,2);

create or replace function public.admin_update_payout_request(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
) returns table (request_id uuid, request_status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_request public.payout_requests%rowtype;
begin
  if p_status not in ('processing','paid','rejected') then
    raise exception 'Invalid payout status.';
  end if;
  select * into v_request from public.payout_requests where id = p_request_id for update;
  if not found then raise exception 'Payout request not found.'; end if;
  if v_request.status not in ('pending','processing') then
    raise exception 'This payout request has already been finalized.';
  end if;
  if p_status = 'paid' then
    insert into public.payouts(runner_id,amount,note)
    values (v_request.runner_id,round(v_request.amount,2),coalesce(nullif(btrim(p_admin_note),''),'Payout request '||v_request.id::text));
  end if;
  update public.payout_requests
  set status = p_status,
      admin_note = nullif(left(btrim(coalesce(p_admin_note,'')),500),''),
      updated_at = now(),
      processed_at = case when p_status in ('paid','rejected') then now() else null end
  where id = p_request_id
  returning id,status into request_id,request_status;
  return next;
end;
$function$;
revoke all on function public.admin_update_payout_request(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_update_payout_request(uuid,text,text) to service_role;
