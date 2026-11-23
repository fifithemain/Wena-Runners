create or replace function public.get_runner_leaderboard(p_period text,p_current_profile_id uuid)
returns table (runner_id uuid,display_name text,total_earnings numeric,completed_errands bigint,leaderboard_rank bigint,is_current_user boolean)
language sql stable security definer set search_path = pg_catalog, public as $$
  with bounds as (
    select case p_period
      when 'week' then date_trunc('week',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg'
      when 'month' then date_trunc('month',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg'
      else '-infinity'::timestamptz end as starts_at
  ),
  totals as (
    select j.runner_id,p.full_name,sum(greatest(coalesce(j.final_budget,j.requested_budget,0),0))::numeric(14,2) as earnings,count(*)::bigint as completed_count
    from public.jobs j join public.profiles p on p.id=j.runner_id cross join bounds b
    where j.status='completed' and j.payment_status='paid' and j.completed_at is not null and j.completed_at>=b.starts_at and p.role in ('runner','both')
    group by j.runner_id,p.full_name
  ),
  ranked as (
    select t.runner_id,t.full_name,t.earnings,t.completed_count,
      row_number() over(order by t.earnings desc,t.completed_count desc,t.full_name asc,t.runner_id asc) as place from totals t
  ),
  current_place as (select place from ranked where runner_id=p_current_profile_id)
  select r.runner_id,
    split_part(trim(r.full_name),' ',1)||case when position(' ' in trim(r.full_name))>0 then ' '||upper(left(split_part(trim(r.full_name),' ',2),1))||'.' else '' end,
    r.earnings,r.completed_count,r.place,(r.runner_id=p_current_profile_id)
  from ranked r where r.place<=10 or r.runner_id=p_current_profile_id or r.place=(select place-1 from current_place)
  order by r.place;
$$;
revoke all on function public.get_runner_leaderboard(text,uuid) from public,anon,authenticated;
grant execute on function public.get_runner_leaderboard(text,uuid) to service_role;
comment on function public.get_runner_leaderboard(text,uuid) is 'Server-only ranked totals for completed, paid errands. Public display names are abbreviated.';
