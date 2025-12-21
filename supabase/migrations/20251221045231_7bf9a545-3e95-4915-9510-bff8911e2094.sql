-- Drop existing school-symbols policies that check admins table
DROP POLICY IF EXISTS "Admins can upload school symbols" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update school symbols" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete school symbols" ON storage.objects;

-- Create simpler policies for school-symbols bucket using session variable directly
-- Since the bucket is public for reading and uploads come through the admin dashboard with session set

CREATE POLICY "Anyone can upload school symbols"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'school-symbols' 
  AND current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Anyone can update school symbols"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'school-symbols' 
  AND current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Anyone can delete school symbols"
ON storage.objects
FOR DELETE
TO anon
USING (
  bucket_id = 'school-symbols' 
  AND current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) <> ''
);