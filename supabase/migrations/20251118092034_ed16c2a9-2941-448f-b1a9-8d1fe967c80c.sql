-- Fix RLS policies for teachers table and related issues

-- 1. Add SELECT policy for teachers to view their own data and other teachers
CREATE POLICY "Teachers can view all teachers"
ON public.teachers
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
  )
);

-- 2. Fix file_metadata INSERT policy to avoid teachers table lookup
-- Drop existing policy
DROP POLICY IF EXISTS "Teachers can insert file metadata" ON public.file_metadata;

-- Create new policy that directly checks the session
CREATE POLICY "Teachers can insert file metadata"
ON public.file_metadata
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND uploaded_by::text = current_setting('app.current_teacher_id', true)
);

-- 3. Fix monthly INSERT policy to avoid teachers table lookup
-- The existing policy already uses session check, but let's ensure it's efficient
DROP POLICY IF EXISTS "Teachers can insert monthly recommendations" ON public.monthly;

CREATE POLICY "Teachers can insert monthly recommendations"
ON public.monthly
FOR INSERT
TO anon, authenticated
WITH CHECK (
  teacher_id IS NOT NULL
  AND (
    teacher_id::text = current_setting('app.current_teacher_id', true)
    OR EXISTS (
      SELECT 1 FROM public.admins
      WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
  )
);

-- 4. Fix demerits INSERT policy similarly
DROP POLICY IF EXISTS "Teachers can insert demerits" ON public.demerits;

CREATE POLICY "Teachers can insert demerits"
ON public.demerits
FOR INSERT
TO anon, authenticated
WITH CHECK (
  teacher_id IS NOT NULL
  AND teacher_id::text = current_setting('app.current_teacher_id', true)
);

-- 5. Fix merits INSERT policy similarly
DROP POLICY IF EXISTS "Teachers can insert merits" ON public.merits;

CREATE POLICY "Teachers can insert merits"
ON public.merits
FOR INSERT
TO anon, authenticated
WITH CHECK (
  teacher_id IS NOT NULL
  AND teacher_id::text = current_setting('app.current_teacher_id', true)
);