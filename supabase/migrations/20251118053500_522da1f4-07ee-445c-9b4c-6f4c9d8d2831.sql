-- Remove default permissions from anon and authenticated roles
REVOKE ALL ON public.students FROM anon;
REVOKE ALL ON public.students FROM authenticated;
REVOKE ALL ON public.teachers FROM anon;
REVOKE ALL ON public.teachers FROM authenticated;
REVOKE ALL ON public.admins FROM anon;
REVOKE ALL ON public.admins FROM authenticated;

-- Drop existing policies on students table
DROP POLICY IF EXISTS "Students can view own data" ON public.students;
DROP POLICY IF EXISTS "Teachers can view all students" ON public.students;
DROP POLICY IF EXISTS "Admins have full access" ON public.students;

-- Create strict policy for students to view their own data
CREATE POLICY "students_select_own"
ON public.students
FOR SELECT
TO authenticated
USING (
  current_setting('app.current_student_id', true) IS NOT NULL 
  AND current_setting('app.current_student_id', true) != ''
  AND student_id = current_setting('app.current_student_id', true)
);

-- Create strict policy for teachers to view all students
CREATE POLICY "teachers_select_all_students"
ON public.students
FOR SELECT
TO authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL 
  AND current_setting('app.current_teacher_id', true) != ''
  AND EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
);

-- Create strict policy for admins to have full access
CREATE POLICY "admins_full_access_students"
ON public.students
FOR ALL
TO authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) != ''
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
)
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) != ''
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
);

-- Drop existing policies on teachers table
DROP POLICY IF EXISTS "Admins have full access to teachers" ON public.teachers;

-- Create strict policy for admins on teachers table
CREATE POLICY "admins_full_access_teachers"
ON public.teachers
FOR ALL
TO authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) != ''
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
)
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) != ''
  AND EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
);