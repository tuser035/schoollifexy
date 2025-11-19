-- Drop all existing RLS policies on file_metadata
DROP POLICY IF EXISTS "Admins can read all file metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Admins can insert file metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Admins can delete file metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Allow authenticated users to read file metadata" ON public.file_metadata;
DROP POLICY IF EXISTS "Allow service role to manage file metadata" ON public.file_metadata;

-- Drop all existing storage policies for evidence-photos
DROP POLICY IF EXISTS "Admins can read all evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own evidence photos" ON storage.objects;

-- Enable RLS on file_metadata
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE id = user_id_input
  );
END;
$$;

-- Create RLS policies for file_metadata
-- Admins can read all file metadata
CREATE POLICY "Admins can read all file metadata"
ON public.file_metadata
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
);

-- Admins can insert file metadata
CREATE POLICY "Admins can insert file metadata"
ON public.file_metadata
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
);

-- Admins can delete file metadata
CREATE POLICY "Admins can delete file metadata"
ON public.file_metadata
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
);

-- Create storage policies for evidence-photos bucket
-- Allow admins to read all files
CREATE POLICY "Admins can read all evidence photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evidence-photos'
  AND EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
);

-- Allow admins to upload files
CREATE POLICY "Admins can upload evidence photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidence-photos'
  AND EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete evidence photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidence-photos'
  AND EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true))
);