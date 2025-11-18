-- Fix RLS policies for students table to avoid admins table lookup

-- Drop existing admin policies that query the admins table
DROP POLICY IF EXISTS "admins_full_access_students" ON public.students;
DROP POLICY IF EXISTS "Admins have full access to students" ON public.students;
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;

-- Create new efficient policies that only check session variables
CREATE POLICY "Admins can view all students"
ON public.students
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert students"
ON public.students
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can update students"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete students"
ON public.students
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);