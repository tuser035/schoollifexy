-- Fix storage RLS policies for evidence-photos bucket
-- The issue was incorrect syntax in current_setting() calls

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can upload to evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update files in evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view files in evidence-photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to evidence-photos" ON storage.objects;

-- Teachers can upload files to evidence-photos bucket
CREATE POLICY "Teachers can upload to evidence-photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'evidence-photos'
  AND EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
  )
);

-- Teachers can update files in evidence-photos
CREATE POLICY "Teachers can update files in evidence-photos"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'evidence-photos'
  AND EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
  )
);

-- Teachers can view files in evidence-photos
CREATE POLICY "Teachers can view files in evidence-photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'evidence-photos'
  AND EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
  )
);

-- Admins can upload to evidence-photos
CREATE POLICY "Admins can upload to evidence-photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'evidence-photos'
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Admins can update files in evidence-photos
CREATE POLICY "Admins can update files in evidence-photos"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'evidence-photos'
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Admins can view files in evidence-photos
CREATE POLICY "Admins can view files in evidence-photos"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'evidence-photos'
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);
