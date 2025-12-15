-- Allow custom-auth (anon) users to upload/read email attachments in Storage bucket
-- Bucket: email-attachments

-- Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('email-attachments', 'email-attachments', true)
on conflict (id) do update set public = excluded.public;

-- Storage RLS policies
-- Note: storage.objects already has RLS enabled in Supabase-managed schema.

drop policy if exists "Email attachments are publicly readable" on storage.objects;
create policy "Email attachments are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'email-attachments');

drop policy if exists "Email attachments can be uploaded" on storage.objects;
create policy "Email attachments can be uploaded"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'email-attachments');

drop policy if exists "Email attachments can be updated" on storage.objects;
create policy "Email attachments can be updated"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'email-attachments')
with check (bucket_id = 'email-attachments');

drop policy if exists "Email attachments can be deleted" on storage.objects;
create policy "Email attachments can be deleted"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'email-attachments');
