-- Enable RLS on merits, demerits, and monthly tables
ALTER TABLE public.merits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demerits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Teachers can insert merits" ON public.merits;
DROP POLICY IF EXISTS "Teachers can view merits" ON public.merits;
DROP POLICY IF EXISTS "Teachers can insert demerits" ON public.demerits;
DROP POLICY IF EXISTS "Teachers can view demerits" ON public.demerits;
DROP POLICY IF EXISTS "Teachers can insert monthly" ON public.monthly;
DROP POLICY IF EXISTS "Teachers can view monthly" ON public.monthly;
DROP POLICY IF EXISTS "Admins can view merits" ON public.merits;
DROP POLICY IF EXISTS "Admins can view demerits" ON public.demerits;
DROP POLICY IF EXISTS "Admins can view monthly" ON public.monthly;

-- Merits policies for teachers
CREATE POLICY "Teachers can insert merits" ON public.merits
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    AND teacher_id::text = current_setting('app.current_teacher_id', true)
  );

CREATE POLICY "Teachers can view merits" ON public.merits
  FOR SELECT
  USING (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    OR current_setting('app.current_admin_id', true) IS NOT NULL
  );

-- Demerits policies for teachers
CREATE POLICY "Teachers can insert demerits" ON public.demerits
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    AND teacher_id::text = current_setting('app.current_teacher_id', true)
  );

CREATE POLICY "Teachers can view demerits" ON public.demerits
  FOR SELECT
  USING (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    OR current_setting('app.current_admin_id', true) IS NOT NULL
  );

-- Monthly policies for teachers
CREATE POLICY "Teachers can insert monthly" ON public.monthly
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    AND teacher_id::text = current_setting('app.current_teacher_id', true)
  );

CREATE POLICY "Teachers can view monthly" ON public.monthly
  FOR SELECT
  USING (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    OR current_setting('app.current_admin_id', true) IS NOT NULL
  );

-- Storage policies for evidence-photos bucket
DROP POLICY IF EXISTS "Teachers can upload evidence photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view evidence photos" ON storage.objects;

CREATE POLICY "Teachers can upload evidence photos" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence-photos'
    AND current_setting('app.current_teacher_id', true) IS NOT NULL
  );

CREATE POLICY "Teachers can view evidence photos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'evidence-photos'
    AND (
      current_setting('app.current_teacher_id', true) IS NOT NULL
      OR current_setting('app.current_admin_id', true) IS NOT NULL
    )
  );