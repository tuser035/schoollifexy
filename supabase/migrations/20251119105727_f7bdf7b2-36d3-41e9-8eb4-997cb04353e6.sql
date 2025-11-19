-- Fix storage policies for evidence-photos bucket
-- The issue: "TO public" means the "public" ROLE, not "publicly accessible"
-- Supabase JS client uses "anon" role by default
-- We need to explicitly allow "anon" role OR remove the TO clause

DROP POLICY IF EXISTS "Allow public uploads to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from evidence-photos" ON storage.objects;

-- Create policies without TO clause (applies to all roles including anon)
CREATE POLICY "evidence_photos_upload"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_update"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'evidence-photos')
WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "evidence_photos_delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'evidence-photos');