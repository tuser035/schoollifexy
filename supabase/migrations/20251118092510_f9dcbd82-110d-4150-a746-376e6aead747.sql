-- Fix infinite recursion in teachers table RLS policies

-- Drop policies that cause infinite recursion
DROP POLICY IF EXISTS "Teachers can view all teachers" ON public.teachers;
DROP POLICY IF EXISTS "admins_full_access_teachers" ON public.teachers;

-- Create new policies that only check session variables (no table lookups)
CREATE POLICY "Teachers can view all teachers"
ON public.teachers
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
);

CREATE POLICY "Admins can view all teachers"
ON public.teachers
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert teachers"
ON public.teachers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can update teachers"
ON public.teachers
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete teachers"
ON public.teachers
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);