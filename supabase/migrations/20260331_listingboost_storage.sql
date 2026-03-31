-- Storage buckets for ListingBoost AI

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listingboost-originals', 'listingboost-originals', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('listingboost-improved', 'listingboost-improved', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('listingboost-mockups', 'listingboost-mockups', true, 5242880, array['text/html','image/png']),
  ('listingboost-attachments', 'listingboost-attachments', false, 10485760, array['image/png','application/pdf'])
on conflict (id) do nothing;

-- Minimal policies for authenticated operators (service role bypasses these anyway)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='listingboost_auth_read'
  ) then
    create policy listingboost_auth_read
      on storage.objects for select
      to authenticated
      using (bucket_id like 'listingboost-%');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='listingboost_auth_write'
  ) then
    create policy listingboost_auth_write
      on storage.objects for insert
      to authenticated
      with check (bucket_id like 'listingboost-%');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='listingboost_auth_update_delete'
  ) then
    create policy listingboost_auth_update_delete
      on storage.objects for update
      to authenticated
      using (bucket_id like 'listingboost-%')
      with check (bucket_id like 'listingboost-%');
  end if;
end
$$;
