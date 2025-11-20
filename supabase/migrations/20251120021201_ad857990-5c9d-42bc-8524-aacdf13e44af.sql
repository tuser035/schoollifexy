-- Add storage policies for teachers to upload to evidence-photos bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can upload to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update own files in evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view files in evidence-photos" ON storage.objects;

-- Teachers can upload files to evidence-photos bucket
CREATE POLICY "Teachers can upload to evidence-photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'evidence-photos'
  AND (
    (current_setting('app.current_teacher_id'::text, true) IS NOT NULL)
    AND (current_setting('app.current_teacher_id'::text, true) <> ''::text)
  )
);

-- Teachers can update their own uploaded files
CREATE POLICY "Teachers can update own files in evidence-photos"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'evidence-photos'
  AND (
    (current_setting('app.current_teacher_id'::text, true) IS NOT NULL)
    AND (current_setting('app.current_teacher_id'::text, true) <> ''::text)
  )
);

-- Teachers can view files in evidence-photos
CREATE POLICY "Teachers can view files in evidence-photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'evidence-photos'
  AND (
    (current_setting('app.current_teacher_id'::text, true) IS NOT NULL)
    AND (current_setting('app.current_teacher_id'::text, true) <> ''::text)
  )
);