-- Fix file_metadata RLS policy for teachers
-- Drop all existing insert policies
DROP POLICY IF EXISTS "Allow authenticated inserts to file_metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Admins can insert file metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Teachers can insert file metadata" ON public.file_metadata;

-- Create policy for teachers to insert file metadata
CREATE POLICY "Teachers can insert file metadata"
ON public.file_metadata
FOR INSERT
TO public
WITH CHECK (
  (current_setting('app.current_teacher_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_teacher_id'::text, true) <> ''::text)
  AND ((uploaded_by)::text = current_setting('app.current_teacher_id'::text, true))
);

-- Also allow admins to insert file metadata
CREATE POLICY "Admins can insert file metadata"
ON public.file_metadata
FOR INSERT
TO public
WITH CHECK (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);