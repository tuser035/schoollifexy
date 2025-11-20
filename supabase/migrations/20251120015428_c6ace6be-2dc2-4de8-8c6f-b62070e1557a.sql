-- Fix file_metadata RLS policy to avoid admins table access issue
DROP POLICY IF EXISTS "Admins can read all file metadata" ON public.file_metadata;

-- Create simplified policy that doesn't reference admins table
CREATE POLICY "Admins can read all file metadata"
ON public.file_metadata
FOR SELECT
TO public
USING (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);