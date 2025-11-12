-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view evidence photos" ON storage.objects;

-- Create updated storage policies for evidence-photos bucket
-- Allow anyone to upload (we rely on app-level session checks)
CREATE POLICY "Allow uploads to evidence-photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'evidence-photos');

-- Allow anyone to view photos
CREATE POLICY "Allow public access to evidence-photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidence-photos');

-- Allow updates to evidence-photos
CREATE POLICY "Allow updates to evidence-photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'evidence-photos');

-- Allow deletes from evidence-photos
CREATE POLICY "Allow deletes from evidence-photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'evidence-photos');