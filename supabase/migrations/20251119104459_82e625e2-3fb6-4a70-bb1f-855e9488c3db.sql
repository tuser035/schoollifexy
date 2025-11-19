-- Clean up all existing evidence-photos policies
DROP POLICY IF EXISTS "Allow authenticated uploads to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public access to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files from evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "evidence_photos_delete" ON storage.objects;

-- Create correct policies with proper roles for storage API
-- Storage API uses 'authenticated' and 'anon' roles, NOT 'public'

CREATE POLICY "evidence_photos_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (
  bucket_id = 'evidence-photos'
);

CREATE POLICY "evidence_photos_select_policy"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket_id = 'evidence-photos'
);

CREATE POLICY "evidence_photos_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (
  bucket_id = 'evidence-photos'
)
WITH CHECK (
  bucket_id = 'evidence-photos'
);

CREATE POLICY "evidence_photos_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated, anon
USING (
  bucket_id = 'evidence-photos'
);