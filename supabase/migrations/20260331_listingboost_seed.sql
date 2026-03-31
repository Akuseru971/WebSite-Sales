-- Demo seed data for ListingBoost AI

insert into public.prospects (
  id,
  business_name,
  niche,
  city,
  country,
  website,
  public_email,
  source,
  source_query,
  status,
  confidence_score,
  notes
) values
  (
    '10000000-0000-0000-0000-000000000001',
    'Urban Nest Student Suites',
    'student accommodation',
    'London',
    'United Kingdom',
    'https://example-student-suites.com',
    'contact@example-student-suites.com',
    'seed',
    'student accommodation london',
    'researched',
    0.92,
    'Seeded demo prospect for internal testing'
  )
on conflict (id) do nothing;

insert into public.properties (
  id,
  prospect_id,
  property_name,
  property_url,
  address,
  category,
  extracted_at,
  mockup_status
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Urban Nest Camden House',
    'https://example-student-suites.com/camden-house',
    'Camden, London',
    'student accommodation',
    now(),
    'pending'
  )
on conflict (id) do nothing;

insert into public.campaigns (
  id,
  name,
  variant,
  status,
  daily_cap
) values
  (
    '30000000-0000-0000-0000-000000000001',
    'London Student Housing Wave',
    'standard',
    'draft',
    30
  )
on conflict (id) do nothing;
