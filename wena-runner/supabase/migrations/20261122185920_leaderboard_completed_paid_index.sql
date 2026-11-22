create index if not exists jobs_completed_paid_runner_leaderboard_idx
on public.jobs (completed_at desc, runner_id)
include (final_budget, requested_budget)
where status = 'completed' and payment_status = 'paid';
