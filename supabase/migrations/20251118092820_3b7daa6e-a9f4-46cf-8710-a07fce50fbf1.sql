-- Fix file_metadata admin policies

DROP POLICY IF EXISTS "Admins can view all file metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Admins can insert file metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Admins can delete file metadata" ON public.file_metadata;

CREATE POLICY "Admins can view all file metadata"
ON public.file_metadata
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert file metadata"
ON public.file_metadata
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND uploaded_by::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can delete file metadata"
ON public.file_metadata
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);