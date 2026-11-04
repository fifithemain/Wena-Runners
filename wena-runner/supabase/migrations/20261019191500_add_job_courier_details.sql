alter table public.jobs
  add column if not exists courier_required boolean not null default false,
  add column if not exists courier_provider text,
  add column if not exists courier_fee numeric(12,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.jobs'::regclass
      and conname = 'jobs_courier_details_check'
  ) then
    alter table public.jobs
      add constraint jobs_courier_details_check check (
        (not courier_required and courier_provider is null and courier_fee is null)
        or (
          courier_required
          and courier_provider in ('The Courier Guy', 'PUDO', 'PAXI', 'Fastway Couriers', 'Aramex')
          and courier_fee > 0
          and courier_fee <= 100000
        )
      );
  end if;
end
$$;
