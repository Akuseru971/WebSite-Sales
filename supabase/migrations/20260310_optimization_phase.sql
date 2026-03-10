-- Optimization phase persistence artifacts

alter table public.demo_sites
  add column if not exists optimization_report_json jsonb,
  add column if not exists optimization_plan_json jsonb,
  add column if not exists optimization_status text,
  add column if not exists optimized_site_json jsonb,
  add column if not exists optimized_image_selection_json jsonb,
  add column if not exists optimization_run_history jsonb;

create index if not exists demo_sites_optimization_status_idx
  on public.demo_sites (optimization_status);

create index if not exists demo_sites_optimization_report_json_gin_idx
  on public.demo_sites using gin (optimization_report_json);
