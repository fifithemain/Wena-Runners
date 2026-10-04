-- WENA Runner Network — Supabase schema (v2.0)
-- Run this in your Supabase project's SQL editor for a FRESH project.
-- Already running the app? Use migrations_2.sql then migrations_3.sql
-- instead — they only add what's new, without touching existing data.

create extension if not exists "uuid-ossp";

create table if not exists runners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null unique,
  zone text not null,
  pin_hash text not null,
  status text not null default 'pending', -- pending | approved | blocked
  completed_jobs int not null default 0,

  -- ID verification (required at signup)
  id_number text,
  id_document_path text,
  selfie_path text,

  -- How we pay the Runner once a job is completed
  payout_method text,          -- e.g. "Bank transfer", "eWallet", "Cash"
  payout_account_name text,
  payout_account_details text, -- account number / eWallet number / etc.

  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),

  -- What to collect, and where
  store_name text not null,
  store_note text,
  item_note text,
  tier text not null, -- small | medium | heavy
  shopper_fee int not null,   -- what the Runner earns
  slip_path text,             -- customer's proof-of-payment to the store (hidden until claimed)

  -- How it gets to the customer
  fulfillment_type text not null default 'delivery', -- delivery | pickup
  courier_fee int not null default 0,

  -- Customer + delivery details (only shown to a Runner once they claim)
  customer_name text not null,
  customer_phone text not null,
  delivery_landmark text,
  delivery_lat double precision,
  delivery_lng double precision,

  -- Hand-off confirmation: the customer gives this PIN to the Runner only
  -- once they've actually received the order.
  collection_pin text,

  -- Lifecycle: awaiting_payment -> open -> claimed -> completed
  -- (or -> disputed if a Runner flags a bad slip)
  status text not null default 'awaiting_payment',
  claimed_by uuid references runners(id),
  claimed_at timestamptz,
  completed_at timestamptz,
  is_flagged boolean not null default false,
  flag_reason text,

  -- Payment (Yoco) — this is only ever the service fee, never the goods
  payment_status text not null default 'pending', -- pending | paid | failed
  yoco_checkout_id text,
  paid_at timestamptz,

  created_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key default uuid_generate_v4(),
  runner_id uuid not null references runners(id),
  amount int not null,
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs(status);
create index if not exists jobs_yoco_checkout_idx on jobs(yoco_checkout_id);
create index if not exists payouts_runner_idx on payouts(runner_id);

-- Row Level Security: all access goes through the server (service role key),
-- so client-side access is locked down entirely.
alter table runners enable row level security;
alter table jobs enable row level security;
alter table payouts enable row level security;

-- Private storage buckets. Only the server (service role key) can read
-- or write here — never made public.
insert into storage.buckets (id, name, public) values ('id-documents', 'id-documents', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('store-slips', 'store-slips', false) on conflict (id) do nothing;
