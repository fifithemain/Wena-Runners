-- WENA Runners gamification foundation: private, server-mediated leaderboard and streak rewards.
create table if not exists public.runner_gamification_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.runner_gamification_settings (id, enabled) values (true, false) on conflict (id) do nothing;

create table if not exists public.runner_streak_milestone_rules (
  milestone_days integer primary key check (milestone_days > 0),
  reward_kind text not null default 'badge' check (reward_kind in ('badge','cash')),
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  reward_label text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reward_kind <> 'badge' or reward_amount = 0)
);
insert into public.runner_streak_milestone_rules (milestone_days, reward_kind, reward_amount, reward_label)
values (3,'badge',0,'3-day spark'),(7,'badge',0,'7-day streak'),(14,'badge',0,'14-day streak'),(30,'badge',0,'30-day streak'),(60,'badge',0,'60-day streak'),(100,'badge',0,'100-day legend')
on conflict (milestone_days) do nothing;

create table if not exists public.runner_streaks (
  runner_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= current_streak),
  last_activity_date date,
  updated_at timestamptz not null default now()
);
create table if not exists public.runner_completed_job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null unique references public.jobs(id) on delete restrict,
  runner_id uuid not null references public.profiles(id) on delete restrict,
  completed_local_date date not null,
  qualifying_earnings numeric(12,2) not null check (qualifying_earnings >= 0),
  created_at timestamptz not null default now()
);
create index if not exists runner_completed_job_events_runner_day_idx on public.runner_completed_job_events (runner_id, completed_local_date desc);

create table if not exists public.runner_streak_rewards (
  id uuid primary key default gen_random_uuid(),
  runner_id uuid not null references public.profiles(id) on delete restrict,
  milestone_days integer not null references public.runner_streak_milestone_rules(milestone_days),
  reward_kind text not null check (reward_kind in ('badge','cash')),
  reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  reward_label text not null,
  status text not null default 'earned' check (status in ('earned','approved','paid','reversed')),
  earned_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (runner_id, milestone_days),
  check (reward_kind <> 'badge' or reward_amount = 0)
);
create index if not exists runner_streak_rewards_runner_idx on public.runner_streak_rewards (runner_id, earned_at desc);

alter table public.runner_gamification_settings enable row level security;
alter table public.runner_streak_milestone_rules enable row level security;
alter table public.runner_streaks enable row level security;
alter table public.runner_completed_job_events enable row level security;
alter table public.runner_streak_rewards enable row level security;
revoke all on public.runner_gamification_settings, public.runner_streak_milestone_rules, public.runner_streaks, public.runner_completed_job_events, public.runner_streak_rewards from anon, authenticated;
grant all on public.runner_gamification_settings, public.runner_streak_milestone_rules, public.runner_streaks, public.runner_completed_job_events, public.runner_streak_rewards to service_role;
grant usage, select on sequence public.runner_completed_job_events_id_seq to service_role;

create or replace function public.record_runner_completed_job_streak()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_day date; v_earnings numeric(12,2); v_current integer;
begin
  if new.status <> 'completed' or new.payment_status <> 'paid' or new.completed_at is null or new.runner_id is null
     or (old.status = 'completed' and old.payment_status = 'paid') then return new; end if;
  if not exists (select 1 from public.runner_gamification_settings where id = true and enabled = true) then return new; end if;
  v_day := (new.completed_at at time zone 'Africa/Johannesburg')::date;
  v_earnings := greatest(coalesce(new.final_budget, new.requested_budget, 0), 0);
  insert into public.runner_completed_job_events (job_id,runner_id,completed_local_date,qualifying_earnings)
  values (new.id,new.runner_id,v_day,v_earnings) on conflict (job_id) do nothing;
  if not found then return new; end if;
  insert into public.runner_streaks (runner_id,current_streak,longest_streak,last_activity_date)
  values (new.runner_id,1,1,v_day)
  on conflict (runner_id) do update set
    current_streak = case when public.runner_streaks.last_activity_date = excluded.last_activity_date then public.runner_streaks.current_streak
      when public.runner_streaks.last_activity_date = excluded.last_activity_date - 1 then public.runner_streaks.current_streak + 1 else 1 end,
    longest_streak = greatest(public.runner_streaks.longest_streak,case
      when public.runner_streaks.last_activity_date = excluded.last_activity_date then public.runner_streaks.current_streak
      when public.runner_streaks.last_activity_date = excluded.last_activity_date - 1 then public.runner_streaks.current_streak + 1 else 1 end),
    last_activity_date = greatest(public.runner_streaks.last_activity_date,excluded.last_activity_date), updated_at = now()
  returning current_streak into v_current;
  insert into public.runner_streak_rewards (runner_id,milestone_days,reward_kind,reward_amount,reward_label)
  select new.runner_id,r.milestone_days,r.reward_kind,r.reward_amount,r.reward_label from public.runner_streak_milestone_rules r
  where r.enabled = true and r.milestone_days = v_current on conflict (runner_id,milestone_days) do nothing;
  return new;
end; $$;
revoke all on function public.record_runner_completed_job_streak() from public, anon, authenticated;
drop trigger if exists trg_record_runner_completed_job_streak on public.jobs;
create trigger trg_record_runner_completed_job_streak after update of status,payment_status,completed_at on public.jobs
for each row execute function public.record_runner_completed_job_streak();
comment on table public.runner_completed_job_events is 'Idempotent qualifying events for completed, paid Runner errands; server trigger only.';
comment on table public.runner_streak_rewards is 'Milestone rewards, separate from Runner wallet and affiliate/marketing rewards.';
