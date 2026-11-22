-- Integrated WENA Growth accounts: additive Affiliate and Creator role grants.
create table if not exists public.marketing_feature_flags (
 id boolean primary key default true check(id),
 growth_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.marketing_feature_flags(id,growth_enabled) values(true,false) on conflict(id) do nothing;

create table if not exists public.marketing_partners (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null unique references public.profiles(id) on delete cascade,
 display_name text not null,
 status text not null default 'active' check(status in ('active','paused','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.marketing_partner_applications (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.marketing_partners(id) on delete cascade,
 role_key text not null check(role_key in ('affiliate','creator')),
 status text not null default 'pending' check(status in ('pending','more_information','approved','declined','withdrawn')),
 answers jsonb not null default '{}'::jsonb, terms_version text not null,
 submitted_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
 review_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists marketing_one_pending_application_per_role
 on public.marketing_partner_applications(partner_id,role_key)
 where status in ('pending','more_information');

create table if not exists public.marketing_partner_role_grants (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.marketing_partners(id) on delete cascade,
 role_key text not null check(role_key in ('affiliate','creator')),
 status text not null default 'active' check(status in ('active','suspended','revoked')),
 granted_by_profile_id uuid references public.profiles(id) on delete set null,
 granted_at timestamptz not null default now(), suspended_at timestamptz, revoked_at timestamptz,
 reason_code text, terms_version text not null, accepted_at timestamptz not null default now(),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(partner_id,role_key)
);
create table if not exists public.marketing_audit_log (
 id bigint generated always as identity primary key,
 actor_profile_id uuid references public.profiles(id) on delete set null,
 action text not null, target_type text not null, target_id text not null,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists marketing_audit_target_idx on public.marketing_audit_log(target_type,target_id,created_at desc);

create table if not exists public.marketing_campaigns (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
 description text, campaign_type text not null check(campaign_type in ('affiliate','creator','mixed')),
 status text not null default 'draft' check(status in ('draft','scheduled','active','paused','ended')),
 starts_at timestamptz, ends_at timestamptz, budget_zar numeric(12,2) check(budget_zar is null or budget_zar>=0),
 config jsonb not null default '{}'::jsonb,
 created_by_profile_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create table if not exists public.marketing_campaign_roles (
 campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
 role_key text not null check(role_key in ('affiliate','creator')), primary key(campaign_id,role_key)
);
create table if not exists public.marketing_campaign_assignments (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.marketing_campaigns(id) on delete restrict,
 partner_id uuid not null references public.marketing_partners(id) on delete restrict,
 role_key text not null check(role_key in ('affiliate','creator')),
 status text not null default 'invited' check(status in ('invited','accepted','declined','in_progress','submitted','approved','completed','cancelled')),
 agreed_fee_zar numeric(12,2) not null default 0 check(agreed_fee_zar>=0),
 terms jsonb not null default '{}'::jsonb, invited_at timestamptz not null default now(),
 accepted_at timestamptz, completed_at timestamptz, unique(campaign_id,partner_id,role_key)
);
create table if not exists public.marketing_tracking_links (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.marketing_partners(id) on delete cascade,
 campaign_id uuid references public.marketing_campaigns(id) on delete set null,
 code text not null unique, destination_path text not null default '/',
 channel text not null default 'direct',
 status text not null default 'active' check(status in ('active','paused','revoked')),
 created_at timestamptz not null default now()
);
create index if not exists marketing_tracking_partner_idx on public.marketing_tracking_links(partner_id,created_at desc);
create table if not exists public.marketing_attributions (
 id uuid primary key default gen_random_uuid(),
 tracking_link_id uuid references public.marketing_tracking_links(id) on delete set null,
 partner_id uuid references public.marketing_partners(id) on delete set null,
 anonymous_visitor_key text, source text, medium text, consented boolean not null default false,
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 converted_at timestamptz
);
create index if not exists marketing_attribution_partner_idx on public.marketing_attributions(partner_id,first_seen_at desc);
create table if not exists public.marketing_conversions (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.marketing_partners(id) on delete restrict,
 campaign_id uuid references public.marketing_campaigns(id) on delete set null,
 attribution_id uuid references public.marketing_attributions(id) on delete set null,
 source_type text not null, source_id text not null, conversion_type text not null,
 amount_zar numeric(12,2) not null default 0 check(amount_zar>=0),
 verified_at timestamptz not null, created_at timestamptz not null default now(),
 unique(source_type,source_id,conversion_type)
);
create table if not exists public.marketing_reward_rules (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid references public.marketing_campaigns(id) on delete cascade,
 role_key text not null check(role_key in ('affiliate','creator')),
 reward_type text not null check(reward_type in ('commission','creator_fee','bonus')),
 calculation text not null check(calculation in ('fixed','percentage')),
 amount numeric(12,2) not null check(amount>=0), currency text not null default 'ZAR' check(currency='ZAR'),
 cap_amount numeric(12,2) check(cap_amount is null or cap_amount>=0), enabled boolean not null default false,
 effective_from timestamptz, effective_to timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.marketing_reward_ledger (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.marketing_partners(id) on delete restrict,
 role_key text not null check(role_key in ('affiliate','creator')),
 entry_type text not null check(entry_type in ('pending','approved','paid','reversal','adjustment')),
 reward_type text not null check(reward_type in ('commission','creator_fee','bonus')),
 amount_zar numeric(12,2) not null, idempotency_key text not null unique,
 source_type text, source_id text,
 related_entry_id uuid references public.marketing_reward_ledger(id) on delete restrict,
 description text, created_by_profile_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists marketing_reward_partner_idx on public.marketing_reward_ledger(partner_id,created_at desc);
create table if not exists public.marketing_payout_requests (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.marketing_partners(id) on delete restrict,
 amount_zar numeric(12,2) not null check(amount_zar>=1),
 status text not null default 'pending' check(status in ('pending','processing','paid','rejected')),
 payout_reference text, admin_note text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), processed_at timestamptz
);
create table if not exists public.marketing_creator_deliverables (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.marketing_campaign_assignments(id) on delete cascade,
 title text not null, brief text, due_at timestamptz, submission_path text, submission_note text,
 status text not null default 'not_started' check(status in ('not_started','submitted','changes_requested','approved','rejected')),
 reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
 review_note text, submitted_at timestamptz, reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.marketing_creator_usage_licenses (
 id uuid primary key default gen_random_uuid(),
 deliverable_id uuid not null references public.marketing_creator_deliverables(id) on delete cascade,
 channels text[] not null default '{}', territory text not null default 'South Africa',
 starts_at timestamptz, ends_at timestamptz, paid_media_allowed boolean not null default false,
 exclusivity text, status text not null default 'draft' check(status in ('draft','offered','accepted','expired','revoked')),
 accepted_at timestamptz, created_at timestamptz not null default now(),
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);

do $$
declare t text;
begin
 foreach t in array array[
 'marketing_feature_flags','marketing_partners','marketing_partner_applications',
 'marketing_partner_role_grants','marketing_audit_log','marketing_campaigns',
 'marketing_campaign_roles','marketing_campaign_assignments','marketing_tracking_links',
 'marketing_attributions','marketing_conversions','marketing_reward_rules',
 'marketing_reward_ledger','marketing_payout_requests','marketing_creator_deliverables',
 'marketing_creator_usage_licenses'
 ] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
grant usage,select on sequence public.marketing_audit_log_id_seq to service_role;

create or replace function public.prevent_marketing_ledger_mutation()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin raise exception 'Marketing reward ledger is append-only; add a compensating entry instead.'; end;
$$;
revoke all on function public.prevent_marketing_ledger_mutation() from public,anon,authenticated;
drop trigger if exists marketing_reward_ledger_immutable on public.marketing_reward_ledger;
create trigger marketing_reward_ledger_immutable before update or delete on public.marketing_reward_ledger
for each row execute function public.prevent_marketing_ledger_mutation();
comment on table public.marketing_partners is 'One Growth partner row per existing WENA profile; never a second login or profile.';
comment on table public.marketing_partner_role_grants is 'Server-authoritative additive Affiliate/Creator capabilities, independent of profiles.role.';
comment on table public.marketing_reward_ledger is 'Append-only Growth ledger. Runner wallet and payouts are separate.';
