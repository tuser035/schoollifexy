-- Add image_url column to merits table
ALTER TABLE public.merits
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to demerits table
ALTER TABLE public.demerits
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to monthly table
ALTER TABLE public.monthly
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view evidence photos" ON storage.objects;

-- Create storage policies for evidence-photos bucket
CREATE POLICY "Teachers can upload evidence photos"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (
  bucket_id = 'evidence-photos' AND
  (
    EXISTS (
      SELECT 1 FROM public.teachers
      WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
    )
  )
);

CREATE POLICY "Everyone can view evidence photos"
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (bucket_id = 'evidence-photos');