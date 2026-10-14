-- Clerk identity mapping and secure runner payout requests.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;
alter table public.profiles
  alter column id set default extensions.uuid_generate_v4(),
  alter column phone drop not null;
alter table public.profiles
  add column if not exists clerk_user_id text;
create unique index if not exists profiles_clerk_user_id_uidx
  on public.profiles (clerk_user_id)
  where clerk_user_id is not null;

create table if not exists public.payout_requests (
  id uuid primary key default extensions.uuid_generate_v4(),
  runner_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 1 and amount <= 100000),
  method text not null check (method in ('bank_transfer','mobile_money')),
  account_details text not null check (length(btrim(account_details)) between 3 and 500),
  status text not null default 'pending' check (status in ('pending','processing','paid','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists payout_requests_runner_created_idx on public.payout_requests (runner_id, created_at desc);
create index if not exists payout_requests_status_created_idx on public.payout_requests (status, created_at asc);
alter table public.payout_requests enable row level security;
revoke all on table public.payout_requests from anon, authenticated;
grant all on table public.payout_requests to service_role;

create or replace function public.request_runner_payout(p_runner_id uuid, p_amount numeric, p_method text, p_account_details text)
returns table (request_id uuid, request_amount numeric, request_method text, request_status text, request_created_at timestamptz)
language plpgsql security definer set search_path = ''
as $function$
declare
  v_profile public.profiles%rowtype;
  v_earned numeric(12,2);
  v_paid numeric(12,2);
  v_reserved numeric(12,2);
  v_request public.payout_requests%rowtype;
begin
  if p_runner_id is null then raise exception 'Sign in first.'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'Enter a valid payout amount.'; end if;
  if p_method not in ('bank_transfer','mobile_money') then raise exception 'Choose a valid payout method.'; end if;
  if p_account_details is null or length(btrim(p_account_details)) < 3 or length(p_account_details) > 500 then raise exception 'Enter valid payout details.'; end if;
  select * into v_profile from public.profiles where id = p_runner_id for update;
  if not found then raise exception 'Runner profile not found.'; end if;
  if v_profile.role not in ('runner','both') then raise exception 'Only Runner accounts can request payouts.'; end if;
  select coalesce(sum(coalesce(j.final_budget,j.requested_budget,0)),0) into v_earned from public.jobs j where j.runner_id=p_runner_id and j.status='completed';
  select coalesce(sum(p.amount),0) into v_paid from public.payouts p where p.runner_id=p_runner_id;
  select coalesce(sum(pr.amount),0) into v_reserved from public.payout_requests pr where pr.runner_id=p_runner_id and pr.status in ('pending','processing');
  if p_amount > greatest(v_earned-v_paid-v_reserved,0) then raise exception 'Payout amount exceeds your available balance.'; end if;
  insert into public.payout_requests(runner_id,amount,method,account_details) values(p_runner_id,round(p_amount,2),p_method,btrim(p_account_details)) returning * into v_request;
  return query select v_request.id,v_request.amount,v_request.method,v_request.status,v_request.created_at;
end;
$function$;
revoke all on function public.request_runner_payout(uuid,numeric,text,text) from public, anon, authenticated;
grant execute on function public.request_runner_payout(uuid,numeric,text,text) to service_role;

create or replace function public.admin_update_payout_request(p_request_id uuid,p_status text,p_admin_note text default null)
returns table(request_id uuid,request_status text)
language plpgsql security definer set search_path = ''
as $function$
declare v_request public.payout_requests%rowtype;
begin
  if p_status not in ('processing','paid','rejected') then raise exception 'Invalid payout status.'; end if;
  select * into v_request from public.payout_requests where id=p_request_id for update;
  if not found then raise exception 'Payout request not found.'; end if;
  if v_request.status not in ('pending','processing') then raise exception 'This payout request has already been finalized.'; end if;
  if p_status='paid' then
    insert into public.payouts(runner_id,amount,note) values(v_request.runner_id,round(v_request.amount)::integer,coalesce(nullif(btrim(p_admin_note),''),'Payout request '||v_request.id::text));
  end if;
  update public.payout_requests set status=p_status,admin_note=nullif(left(btrim(coalesce(p_admin_note,'')),500),''),updated_at=now(),processed_at=case when p_status in ('paid','rejected') then now() else null end where id=p_request_id returning id,status into request_id,request_status;
  return next;
end;
$function$;
revoke all on function public.admin_update_payout_request(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_update_payout_request(uuid,text,text) to service_role;
