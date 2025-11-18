-- Fix infinite recursion in student_groups and teacher_groups RLS policies

-- Drop all policies that cause table lookups
DROP POLICY IF EXISTS "Admins can view own groups" ON public.student_groups;
DROP POLICY IF EXISTS "Admins can insert groups" ON public.student_groups;
DROP POLICY IF EXISTS "Admins can update own groups" ON public.student_groups;
DROP POLICY IF EXISTS "Admins can delete own groups" ON public.student_groups;
DROP POLICY IF EXISTS "Teachers can view own groups" ON public.student_groups;
DROP POLICY IF EXISTS "Teachers can insert groups" ON public.student_groups;
DROP POLICY IF EXISTS "Teachers can update own groups" ON public.student_groups;
DROP POLICY IF EXISTS "Teachers can delete own groups" ON public.student_groups;

-- Create new efficient policies for student_groups
CREATE POLICY "Admins can view own student groups"
ON public.student_groups
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can insert student groups"
ON public.student_groups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can update own student groups"
ON public.student_groups
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can delete own student groups"
ON public.student_groups
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Teachers can view own student groups"
ON public.student_groups
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);

CREATE POLICY "Teachers can insert student groups"
ON public.student_groups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);

CREATE POLICY "Teachers can update own student groups"
ON public.student_groups
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);

CREATE POLICY "Teachers can delete own student groups"
ON public.student_groups
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);

-- Fix teacher_groups policies similarly
DROP POLICY IF EXISTS "Admins can view own teacher groups" ON public.teacher_groups;
DROP POLICY IF EXISTS "Admins can insert teacher groups" ON public.teacher_groups;
DROP POLICY IF EXISTS "Admins can update own teacher groups" ON public.teacher_groups;
DROP POLICY IF EXISTS "Admins can delete own teacher groups" ON public.teacher_groups;
DROP POLICY IF EXISTS "Teachers can view own teacher groups" ON public.teacher_groups;
DROP POLICY IF EXISTS "Teachers can insert teacher groups" ON public.teacher_groups;
DROP POLICY IF EXISTS "Teachers can update own teacher groups" ON public.teacher_groups;
DROP POLICY IF EXISTS "Teachers can delete own teacher groups" ON public.teacher_groups;

CREATE POLICY "Admins can view own teacher groups"
ON public.teacher_groups
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can insert teacher groups"
ON public.teacher_groups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can update own teacher groups"
ON public.teacher_groups
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can delete own teacher groups"
ON public.teacher_groups
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Teachers can view own teacher groups"
ON public.teacher_groups
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);

CREATE POLICY "Teachers can insert teacher groups"
ON public.teacher_groups
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);

CREATE POLICY "Teachers can update own teacher groups"
ON public.teacher_groups
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);

CREATE POLICY "Teachers can delete own teacher groups"
ON public.teacher_groups
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND admin_id::text = current_setting('app.current_teacher_id', true)
);