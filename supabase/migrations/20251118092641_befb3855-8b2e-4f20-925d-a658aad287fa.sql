-- Fix remaining tables with infinite recursion issues

-- ========== audit_logs ==========
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

-- ========== career_counseling ==========
DROP POLICY IF EXISTS "Admins can view all counseling records" ON public.career_counseling;
DROP POLICY IF EXISTS "Admins can insert counseling records" ON public.career_counseling;
DROP POLICY IF EXISTS "Admins can update counseling records" ON public.career_counseling;
DROP POLICY IF EXISTS "Admins can delete counseling records" ON public.career_counseling;
DROP POLICY IF EXISTS "Teachers can view all counseling records" ON public.career_counseling;

CREATE POLICY "Admins can view all counseling records"
ON public.career_counseling
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert counseling records"
ON public.career_counseling
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can update counseling records"
ON public.career_counseling
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete counseling records"
ON public.career_counseling
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Teachers can view all counseling records"
ON public.career_counseling
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
);

-- ========== demerits ==========
DROP POLICY IF EXISTS "Admins can insert demerits" ON public.demerits;
DROP POLICY IF EXISTS "Admins have full access to demerits" ON public.demerits;
DROP POLICY IF EXISTS "Teachers can view all demerits" ON public.demerits;

CREATE POLICY "Admins can view all demerits"
ON public.demerits
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert demerits"
ON public.demerits
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can update demerits"
ON public.demerits
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete demerits"
ON public.demerits
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Teachers can view all demerits"
ON public.demerits
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
);

-- ========== departments ==========
DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

CREATE POLICY "Admins can insert departments"
ON public.departments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can update departments"
ON public.departments
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete departments"
ON public.departments
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);