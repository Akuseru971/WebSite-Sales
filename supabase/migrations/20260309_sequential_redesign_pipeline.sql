-- Strict multi-step sequential redesign pipeline artifacts
-- Persists each stage output for inspectability and debugging.

alter table public.demo_sites
  add column if not exists crawl_result jsonb,
  add column if not exists rendered_dom jsonb,
  add column if not exists reconstructed_source jsonb,
  add column if not exists raw_content jsonb,
  add column if not exists raw_images jsonb,
  add column if not exists normalized_content jsonb,
  add column if not exists selected_images jsonb,
  add column if not exists brand_profile jsonb,
  add column if not exists source_quality_score jsonb,
  add column if not exists redesign_plan jsonb,
  add column if not exists completed_content jsonb,
  add column if not exists translated_content jsonb,
  add column if not exists final_render_data jsonb,
  add column if not exists ai_review jsonb,
  add column if not exists correction_pass jsonb,
  add column if not exists pipeline_run_json jsonb;

create index if not exists demo_sites_pipeline_run_json_gin_idx
  on public.demo_sites using gin (pipeline_run_json);
