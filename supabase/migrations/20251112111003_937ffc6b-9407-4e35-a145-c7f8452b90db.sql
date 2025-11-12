-- Drop all existing policies for evidence-photos bucket
DROP POLICY IF EXISTS "Teachers can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from evidence-photos" ON storage.objects;

-- Create new simplified storage policies
CREATE POLICY "evidence_photos_insert"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_select"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'evidence-photos');