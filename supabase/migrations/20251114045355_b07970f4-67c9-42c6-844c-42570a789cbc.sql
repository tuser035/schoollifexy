-- Ensure edufine-documents bucket exists and is public
insert into storage.buckets (id, name, public)
values ('edufine-documents', 'edufine-documents', true)
on conflict (id) do update set public = true;

-- Allow public read for edufine-documents
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' and policyname='Public can view edufine documents'
  ) then
    create policy "Public can view edufine documents"
    on storage.objects for select
    using (bucket_id = 'edufine-documents');
  end if;
end $$;

-- Allow public upload for edufine-documents
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' and policyname='Public can upload edufine documents'
  ) then
    create policy "Public can upload edufine documents"
    on storage.objects for insert
    with check (bucket_id = 'edufine-documents');
  end if;
end $$;