-- Fix Storage upload RLS for email-attachments bucket
-- Root cause: storage.objects RLS policies must allow INSERT for role 'anon' with correct privileges.

-- Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('email-attachments', 'email-attachments', true)
on conflict (id) do update set public = excluded.public;

-- Recreate policies with explicit role grants and owner check disabled for this bucket
-- NOTE: In Postgres, policy role lists are correct, but privileges must also be granted.

-- Drop old policies if present
drop policy if exists "Email attachments are publicly readable" on storage.objects;
drop policy if exists "Email attachments can be uploaded" on storage.objects;
drop policy if exists "Email attachments can be updated" on storage.objects;
drop policy if exists "Email attachments can be deleted" on storage.objects;

-- Create policies
create policy "Email attachments are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'email-attachments');

create policy "Email attachments can be uploaded"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'email-attachments');

create policy "Email attachments can be updated"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'email-attachments')
with check (bucket_id = 'email-attachments');

create policy "Email attachments can be deleted"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'email-attachments');

-- Grant required privileges on storage schema objects to roles
-- Without these, PostgREST storage upload may still fail even if policies exist.
grant usage on schema storage to anon, authenticated;
grant all on table storage.objects to anon, authenticated;
grant all on table storage.buckets to anon, authenticated;

-- Also ensure sequences are usable (if any are used)
grant usage, select on all sequences in schema storage to anon, authenticated;
