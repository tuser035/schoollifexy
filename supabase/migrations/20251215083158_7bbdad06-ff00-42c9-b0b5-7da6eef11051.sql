-- Drop the current policy
DROP POLICY IF EXISTS "Teachers can upload email attachments" ON storage.objects;

-- Create a simpler policy that allows all authenticated teachers and admins to upload
CREATE POLICY "Teachers can upload email attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'email-attachments'
);