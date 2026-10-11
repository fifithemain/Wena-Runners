-- WENA v3 additive database hardening; does not drop or truncate data.
create index if not exists jobs_status_created_at_idx on public.jobs(status, created_at desc);
create index if not exists jobs_customer_created_at_idx on public.jobs(customer_id, created_at desc);
create index if not exists jobs_runner_status_idx on public.jobs(runner_id, status);
create index if not exists job_offers_job_status_idx on public.job_offers(job_id, status, created_at desc);
create index if not exists job_offers_runner_idx on public.job_offers(runner_id, created_at desc);
create index if not exists job_messages_job_created_idx on public.job_messages(job_id, created_at);
create index if not exists payouts_runner_paid_idx on public.payouts(runner_id, paid_at desc);
insert into storage.buckets(id,name,public) values('receipts','receipts',false) on conflict(id) do nothing;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_offers enable row level security;
alter table public.job_messages enable row level security;
alter table public.payouts enable row level security;
