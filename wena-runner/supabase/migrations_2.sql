-- WENA Runner Network — migration for an existing database
-- Run this once in your Supabase SQL editor. Safe to run even if some
-- parts already exist (everything is "if not exists").

alter table runners add column if not exists id_document_path text;
alter table runners add column if not exists payout_method text;
alter table runners add column if not exists payout_account_name text;
alter table runners add column if not exists payout_account_details text;

alter table jobs add column if not exists payment_status text not null default 'pending';
alter table jobs add column if not exists yoco_checkout_id text;
alter table jobs add column if not exists paid_at timestamptz;

-- New jobs now start life waiting for payment, not straight on the board.
alter table jobs alter column status set default 'awaiting_payment';

create table if not exists payouts (
  id uuid primary key default uuid_generate_v4(),
  runner_id uuid not null references runners(id),
  amount int not null,
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table payouts enable row level security;
create index if not exists payouts_runner_idx on payouts(runner_id);
create index if not exists jobs_yoco_checkout_idx on jobs(yoco_checkout_id);

insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;
