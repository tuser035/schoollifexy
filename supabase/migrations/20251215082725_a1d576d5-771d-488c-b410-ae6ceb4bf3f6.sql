-- Drop the incorrect policy
DROP POLICY IF EXISTS "Teachers can upload email attachments" ON storage.objects;

-- Create correct policy for teachers to upload email attachments
CREATE POLICY "Teachers can upload email attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'email-attachments'
  AND (
    EXISTS (SELECT 1 FROM public.teachers WHERE id::text = (storage.foldername(name))[2])
    OR EXISTS (SELECT 1 FROM public.admins WHERE id::text = (storage.foldername(name))[2])
  )
);