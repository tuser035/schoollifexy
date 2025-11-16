-- Add photo_url column to teachers table
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create teacher-photos storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('teacher-photos', 'teacher-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for teacher-photos bucket
CREATE POLICY "Anyone can view teacher photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'teacher-photos');

CREATE POLICY "Admins can upload teacher photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'teacher-photos' 
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE (id)::text = current_setting('app.current_admin_id', true)
  )
);

CREATE POLICY "Admins can update teacher photos"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'teacher-photos' 
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE (id)::text = current_setting('app.current_admin_id', true)
  )
);

CREATE POLICY "Admins can delete teacher photos"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'teacher-photos' 
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE (id)::text = current_setting('app.current_admin_id', true)
  )
);