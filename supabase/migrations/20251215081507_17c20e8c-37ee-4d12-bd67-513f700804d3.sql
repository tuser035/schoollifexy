-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-attachments',
  'email-attachments',
  true,
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for email attachments
CREATE POLICY "Teachers can upload email attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'email-attachments' 
  AND EXISTS (SELECT 1 FROM public.teachers WHERE id::text = (storage.foldername(name))[2])
);

CREATE POLICY "Anyone can view email attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'email-attachments');