-- WENA Runner Network — Supabase schema
-- Run this in your Supabase project's SQL editor.

create extension if not exists "uuid-ossp";

create table if not exists runners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null unique,
  zone text not null,
  pin_hash text not null,
  status text not null default 'pending', -- pending | approved | blocked
  completed_jobs int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),

  -- What to buy, and where
  store_name text not null,
  store_note text, -- e.g. "any branch", "the one on Sutherland St"
  item_note text,
  tier text not null, -- small | medium | heavy
  shopper_fee int not null,   -- what the Runner earns (from TIERS.runnerCut)

  -- How it gets to the customer
  fulfillment_type text not null default 'delivery', -- delivery | pickup
  courier_fee int not null default 0, -- 0 when fulfillment_type = 'pickup'

  -- Customer + delivery details (only shown to a Runner once they claim)
  customer_name text not null,
  customer_phone text not null,
  delivery_landmark text, -- required if fulfillment_type = 'delivery'
  delivery_lat double precision,
  delivery_lng double precision,

  -- Lifecycle: open -> claimed -> bought -> completed (or cancelled)
  status text not null default 'open',
  claimed_by uuid references runners(id),
  claimed_at timestamptz,
  bought_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs(status);

-- Row Level Security: all access goes through the server (service role key),
-- so client-side access is locked down entirely.
alter table runners enable row level security;
alter table jobs enable row level security;
