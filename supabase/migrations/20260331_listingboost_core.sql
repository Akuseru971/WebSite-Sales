-- ListingBoost AI core schema for internal single-operator SaaS workflow.

create extension if not exists pgcrypto;

create type public.listing_status as enum (
  'new',
  'researched',
  'images_extracted',
  'mockup_generated',
  'email_drafted',
  'sent',
  'opened',
  'replied',
  'interested',
  'closed',
  'ignored'
);

create type public.room_type as enum (
  'bedroom',
  'living_room',
  'kitchen',
  'bathroom',
  'exterior',
  'shared_area',
  'unknown'
);

create type public.mockup_theme as enum ('light', 'dark');
create type public.email_variant as enum ('short', 'standard', 'premium');
create type public.campaign_status as enum ('draft', 'running', 'paused', 'completed', 'failed');

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null default 'Axell Valentino',
  sender_email text not null default '',
  sender_linkedin text not null default 'https://www.linkedin.com/in/axellvalentino?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
  sender_whatsapp text not null default 'https://wa.me/33659059286',
  signature_name text not null default 'Axell Valentino',
  preferred_tone text not null default 'friendly-professional',
  default_subject_style text not null default 'quick-idea',
  default_cta text not null default 'If useful, I can prepare the full upgraded set.',
  branding_primary_color text not null default '#0f172a',
  branding_accent_color text not null default '#f59e0b',
  default_mockup_rating numeric(2,1) not null default 4.7,
  daily_sending_cap integer not null default 40,
  room_prompt_templates jsonb not null default '{}'::jsonb,
  provider_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  niche text,
  city text,
  country text,
  website text,
  public_email text,
  phone text,
  linkedin_url text,
  instagram_url text,
  contact_page_url text,
  source_query text,
  source_url text,
  source text not null default 'manual',
  confidence_score numeric(4,3) not null default 0,
  status public.listing_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  property_name text not null,
  property_url text,
  address text,
  category text,
  extracted_at timestamptz,
  mockup_status text not null default 'pending',
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extracted_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_page_url text not null,
  original_url text,
  storage_path text not null,
  alt_text text,
  room_type public.room_type not null default 'unknown',
  width integer,
  height integer,
  phash text,
  extraction_metadata jsonb not null default '{}'::jsonb,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique(property_id, storage_path)
);

create table if not exists public.improved_images (
  id uuid primary key default gen_random_uuid(),
  extracted_image_id uuid not null references public.extracted_images(id) on delete cascade,
  storage_path text not null,
  prompt_used text not null,
  version integer not null default 1,
  approved boolean not null default false,
  provider text not null default 'openai',
  created_at timestamptz not null default now(),
  unique(extracted_image_id, version)
);

create table if not exists public.mockups (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  html_storage_path text not null,
  png_storage_path text,
  public_token text not null unique,
  theme public.mockup_theme not null default 'light',
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variant public.email_variant not null,
  subject_template text not null,
  body_template text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  variant public.email_variant not null,
  status public.campaign_status not null default 'draft',
  daily_cap integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outbound_emails (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  subject text not null,
  body text not null,
  variant public.email_variant not null,
  sender_email text not null,
  provider text not null default 'resend',
  provider_message_id text,
  sent_at timestamptz,
  open_count integer not null default 0,
  click_count integer not null default 0,
  reply_status text not null default 'none',
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists prospects_status_idx on public.prospects(status);
create index if not exists prospects_city_country_idx on public.prospects(city, country);
create index if not exists properties_prospect_idx on public.properties(prospect_id);
create index if not exists extracted_images_property_idx on public.extracted_images(property_id);
create index if not exists improved_images_extracted_idx on public.improved_images(extracted_image_id);
create index if not exists outbound_emails_prospect_idx on public.outbound_emails(prospect_id);
create index if not exists activity_logs_prospect_idx on public.activity_logs(prospect_id);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

drop trigger if exists prospects_set_updated_at on public.prospects;
create trigger prospects_set_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

drop trigger if exists campaigns_set_updated_at on public.campaigns;
create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

insert into public.settings (id)
select '00000000-0000-0000-0000-000000000001'::uuid
where not exists (
  select 1 from public.settings where id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- RLS can stay enabled even for internal use; service role bypasses it.
alter table public.settings enable row level security;
alter table public.prospects enable row level security;
alter table public.properties enable row level security;
alter table public.extracted_images enable row level security;
alter table public.improved_images enable row level security;
alter table public.mockups enable row level security;
alter table public.email_templates enable row level security;
alter table public.outbound_emails enable row level security;
alter table public.campaigns enable row level security;
alter table public.activity_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='prospects' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.prospects for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='properties' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.properties for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='extracted_images' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.extracted_images for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='improved_images' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.improved_images for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mockups' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.mockups for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='email_templates' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.email_templates for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='outbound_emails' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.outbound_emails for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='campaigns' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.campaigns for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='activity_logs' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.activity_logs for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='settings' and policyname='internal_authenticated_full_access') then
    create policy internal_authenticated_full_access on public.settings for all to authenticated using (true) with check (true);
  end if;
end
$$;
