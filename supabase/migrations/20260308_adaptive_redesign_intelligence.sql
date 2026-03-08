-- Adaptive redesign intelligence storage
-- Stores source website analysis, redesign strategy, and adaptive composition JSON layers.

alter table public.demo_sites
  add column if not exists extracted_site_profile_json jsonb,
  add column if not exists redesign_plan_json jsonb,
  add column if not exists adaptive_site_json jsonb,
  add column if not exists source_screenshots_json jsonb,
  add column if not exists source_structure_json jsonb,
  add column if not exists source_brand_signals_json jsonb;

create index if not exists demo_sites_extracted_site_profile_json_gin_idx
  on public.demo_sites using gin (extracted_site_profile_json);

create index if not exists demo_sites_redesign_plan_json_gin_idx
  on public.demo_sites using gin (redesign_plan_json);

create index if not exists demo_sites_adaptive_site_json_gin_idx
  on public.demo_sites using gin (adaptive_site_json);

create index if not exists demo_sites_source_structure_json_gin_idx
  on public.demo_sites using gin (source_structure_json);

create index if not exists demo_sites_source_brand_signals_json_gin_idx
  on public.demo_sites using gin (source_brand_signals_json);
