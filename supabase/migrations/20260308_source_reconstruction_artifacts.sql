-- Source-first reconstruction artifacts for redesign pipeline
-- Persists inspectable source reconstruction and redesigned output layers.

alter table public.demo_sites
  add column if not exists source_reconstructed_html text,
  add column if not exists source_content_json jsonb,
  add column if not exists source_assets_json jsonb,
  add column if not exists redesigned_site_json jsonb;

create index if not exists demo_sites_source_content_json_gin_idx
  on public.demo_sites using gin (source_content_json);

create index if not exists demo_sites_source_assets_json_gin_idx
  on public.demo_sites using gin (source_assets_json);

create index if not exists demo_sites_redesigned_site_json_gin_idx
  on public.demo_sites using gin (redesigned_site_json);
