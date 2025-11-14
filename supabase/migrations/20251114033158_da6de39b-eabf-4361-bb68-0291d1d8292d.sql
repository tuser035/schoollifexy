-- Create storage bucket for edufine documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('edufine-documents', 'edufine-documents', true);

-- Allow admins to upload files
CREATE POLICY "Admins can upload edufine documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'edufine-documents' 
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- Allow admins to view files
CREATE POLICY "Admins can view edufine documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'edufine-documents'
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete edufine documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'edufine-documents'
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- Allow public access to view files (since bucket is public)
CREATE POLICY "Public can view edufine documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'edufine-documents');