-- Create storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', true);

-- Add image_url column to merits table
ALTER TABLE public.merits
ADD COLUMN image_url TEXT;

-- Add image_url column to demerits table
ALTER TABLE public.demerits
ADD COLUMN image_url TEXT;

-- Add image_url column to monthly table
ALTER TABLE public.monthly
ADD COLUMN image_url TEXT;

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