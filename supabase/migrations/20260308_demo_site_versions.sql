-- Demo site versioning support
-- Run this migration in Supabase SQL editor or migration pipeline.

create table if not exists public.demo_site_versions (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references public.demo_sites(id) on delete cascade,
  version_number integer not null,
  content_json jsonb not null,
  change_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (demo_site_id, version_number)
);

create index if not exists demo_site_versions_demo_site_id_idx
  on public.demo_site_versions (demo_site_id);

create index if not exists demo_site_versions_created_at_idx
  on public.demo_site_versions (created_at desc);

create index if not exists demo_site_versions_content_json_gin_idx
  on public.demo_site_versions using gin (content_json);

-- Ensure demo_sites has expected JSON storage column
alter table public.demo_sites
  add column if not exists generated_content_json jsonb;

create index if not exists demo_sites_generated_content_json_gin_idx
  on public.demo_sites using gin (generated_content_json);
