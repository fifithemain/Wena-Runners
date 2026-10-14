-- Keep Supabase profile UUIDs stable for existing errands and payouts.
alter table public.profiles
  add column if not exists clerk_user_id text;

create unique index if not exists profiles_clerk_user_id_idx
  on public.profiles (clerk_user_id);
