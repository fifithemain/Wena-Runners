-- Clerk becomes the identity provider; profiles remain the internal UUID records
-- referenced by jobs, offers, messages, and payouts.
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
