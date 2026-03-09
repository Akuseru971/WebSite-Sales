-- Background-like phased generation jobs for serverless timeout mitigation.

create table if not exists public.demo_site_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued',
  phase integer not null default 0,
  lead_json jsonb not null,
  site_option_json jsonb not null,
  state_json jsonb,
  result_json jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_site_generation_jobs_status_idx
  on public.demo_site_generation_jobs (status);

create index if not exists demo_site_generation_jobs_created_at_idx
  on public.demo_site_generation_jobs (created_at desc);
