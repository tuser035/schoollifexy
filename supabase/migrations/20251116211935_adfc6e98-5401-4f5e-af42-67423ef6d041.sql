-- Add photo_url column to students table
ALTER TABLE public.students
ADD COLUMN photo_url text;

COMMENT ON COLUMN public.students.photo_url IS '학생 증명사진 URL';

-- Create storage bucket for student photos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for student photos
CREATE POLICY "Anyone can view student photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

CREATE POLICY "Admins can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-photos' AND
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
);

CREATE POLICY "Admins can update student photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'student-photos' AND
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
);

CREATE POLICY "Admins can delete student photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-photos' AND
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
);