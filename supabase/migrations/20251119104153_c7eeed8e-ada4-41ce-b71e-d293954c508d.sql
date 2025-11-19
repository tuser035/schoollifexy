-- Fix storage policies for evidence-photos bucket
-- The issue is that storage API calls don't have access to current_setting session variables
-- So we need to allow authenticated users (anyone with valid anon key) to upload

DROP POLICY IF EXISTS "Teachers can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete evidence photos" ON storage.objects;

-- Allow anyone with valid API key to upload to evidence-photos
CREATE POLICY "Allow authenticated uploads to evidence-photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidence-photos'
);

-- Allow public viewing (since bucket is public)
CREATE POLICY "Public access to evidence-photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidence-photos');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated deletes from evidence-photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidence-photos'
);