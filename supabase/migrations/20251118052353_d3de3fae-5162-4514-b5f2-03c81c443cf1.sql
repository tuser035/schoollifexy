-- Clean up and consolidate Students table RLS policies
-- Drop all existing SELECT policies for students
DROP POLICY IF EXISTS "Students can view own data" ON public.students;
DROP POLICY IF EXISTS "Teachers can view all students" ON public.students;
DROP POLICY IF EXISTS "Admins have full access to students" ON public.students;
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;

-- Create single, clear SELECT policy for students (own data only)
CREATE POLICY "Students can view own data"
ON public.students
FOR SELECT
TO authenticated
USING (student_id = current_setting('app.current_student_id', true));

-- Create SELECT policy for teachers
CREATE POLICY "Teachers can view all students"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
);

-- Create comprehensive admin policy
CREATE POLICY "Admins have full access"
ON public.students
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
);

-- Similarly clean up Teachers table
DROP POLICY IF EXISTS "Admins have full access to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can insert teachers" ON public.teachers;

CREATE POLICY "Admins have full access to teachers"
ON public.teachers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
);

-- Clean up Admins table - NO anonymous access
DROP POLICY IF EXISTS "Admins can delete counseling records" ON public.admins;
DROP POLICY IF EXISTS "Admins can insert counseling records" ON public.admins;
DROP POLICY IF EXISTS "Admins can update counseling records" ON public.admins;
DROP POLICY IF EXISTS "Admins can view all counseling records" ON public.admins;