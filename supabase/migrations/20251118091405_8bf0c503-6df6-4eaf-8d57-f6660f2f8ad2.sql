-- Fix storage RLS policies for evidence-photos bucket
-- The issue is that policies need to explicitly specify roles

-- Drop existing policies
DROP POLICY IF EXISTS "evidence_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_delete" ON storage.objects;

-- Recreate policies with explicit role specification
CREATE POLICY "evidence_photos_insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_select"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_delete"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'evidence-photos');