-- WENA Runner Network — v2.0 migration (slip-based, zero Runner capital model)
-- Run this once in your Supabase SQL editor. Safe to re-run.

alter table runners add column if not exists id_number text;
alter table runners add column if not exists selfie_path text;

alter table jobs add column if not exists slip_path text;
alter table jobs add column if not exists collection_pin text;
alter table jobs add column if not exists is_flagged boolean not null default false;
alter table jobs add column if not exists flag_reason text;

insert into storage.buckets (id, name, public)
values ('store-slips', 'store-slips', false)
on conflict (id) do nothing;
