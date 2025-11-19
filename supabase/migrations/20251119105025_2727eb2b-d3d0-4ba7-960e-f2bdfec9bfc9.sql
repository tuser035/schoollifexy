-- Fix file_metadata INSERT policies
-- Allow teachers and admins to insert file metadata more easily

DROP POLICY IF EXISTS "Teachers can insert file metadata" ON file_metadata;
DROP POLICY IF EXISTS "Admins can insert file metadata" ON file_metadata;

-- Create more permissive INSERT policy for file_metadata
-- Allow anyone with valid API key to insert file metadata
CREATE POLICY "Allow authenticated inserts to file_metadata"
ON file_metadata
FOR INSERT
TO public
WITH CHECK (true);

-- Keep the existing SELECT policy for admins
-- Teachers should also be able to view their own file metadata
CREATE POLICY "Teachers can view own file metadata"
ON file_metadata
FOR SELECT
TO public
USING (
  (current_setting('app.current_teacher_id', true) IS NOT NULL 
   AND uploaded_by::text = current_setting('app.current_teacher_id', true))
  OR
  (current_setting('app.current_admin_id', true) IS NOT NULL 
   AND current_setting('app.current_admin_id', true) <> '')
);