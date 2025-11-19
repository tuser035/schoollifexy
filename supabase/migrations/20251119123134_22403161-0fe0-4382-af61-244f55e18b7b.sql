-- Create storage policies for counseling-attachments bucket
-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins and teachers can upload counseling attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can read counseling attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can delete counseling attachments" ON storage.objects;

-- Allow admins and teachers to upload files
CREATE POLICY "Admins and teachers can upload counseling attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'counseling-attachments'
  AND (
    EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
    OR
    EXISTS (SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true))
  )
);

-- Allow admins and teachers to read files
CREATE POLICY "Admins and teachers can read counseling attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'counseling-attachments'
  AND (
    EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
    OR
    EXISTS (SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true))
  )
);

-- Allow admins to delete files
CREATE POLICY "Admins and teachers can delete counseling attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'counseling-attachments'
  AND (
    EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
    OR
    EXISTS (SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true))
  )
);