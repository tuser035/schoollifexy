-- Storage RLS policies for evidence-photos bucket
-- Teachers should be able to upload evidence photos

-- Drop existing policies if any
DROP POLICY IF EXISTS "Teachers can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view evidence photos" ON storage.objects;

-- Allow teachers to upload to evidence-photos bucket
CREATE POLICY "Teachers can upload evidence photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidence-photos'
  AND (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    OR
    current_setting('app.current_admin_id', true) IS NOT NULL
  )
);

-- Allow anyone to view evidence photos (public bucket)
CREATE POLICY "Anyone can view evidence photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidence-photos');

-- Allow teachers and admins to delete their uploaded photos
CREATE POLICY "Teachers can delete evidence photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidence-photos'
  AND (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    OR
    current_setting('app.current_admin_id', true) IS NOT NULL
  )
);