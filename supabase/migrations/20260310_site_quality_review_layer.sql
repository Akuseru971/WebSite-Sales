-- Mandatory post-generation review layer artifacts

alter table public.demo_sites
  add column if not exists site_quality_audit_json jsonb,
  add column if not exists correction_plan_json jsonb,
  add column if not exists corrected_site_json jsonb,
  add column if not exists validation_status text,
  add column if not exists audit_score numeric(5,2),
  add column if not exists must_fix_flags jsonb;

create index if not exists demo_sites_site_quality_audit_json_gin_idx
  on public.demo_sites using gin (site_quality_audit_json);

create index if not exists demo_sites_validation_status_idx
  on public.demo_sites (validation_status);
