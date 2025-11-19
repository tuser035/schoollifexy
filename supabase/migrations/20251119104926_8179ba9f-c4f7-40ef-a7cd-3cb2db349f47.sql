-- Fix Storage RLS for evidence-photos bucket
-- Based on official Supabase documentation
-- Storage API uses the role from the JWT/anon key

-- First, verify RLS is enabled on storage.objects (it should be by default)
-- DROP and recreate policies to ensure they work correctly

DROP POLICY IF EXISTS "evidence_photos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_delete_policy" ON storage.objects;

-- Create simple, permissive policies for evidence-photos bucket
-- These policies allow anyone with the anon key to access the bucket

CREATE POLICY "Allow public uploads to evidence-photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Allow public reads from evidence-photos"  
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'evidence-photos');

CREATE POLICY "Allow public updates to evidence-photos"
ON storage.objects
FOR UPDATE  
TO public
USING (bucket_id = 'evidence-photos')
WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Allow public deletes from evidence-photos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'evidence-photos');