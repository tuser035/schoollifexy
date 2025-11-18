-- Fix email_history, email_templates, merits, and monthly tables

-- ========== email_history ==========
DROP POLICY IF EXISTS "Admins can insert email history" ON public.email_history;
DROP POLICY IF EXISTS "Admins can view all email history" ON public.email_history;
DROP POLICY IF EXISTS "Allow admins and teachers to insert email history" ON public.email_history;
DROP POLICY IF EXISTS "Allow admins and teachers to read email history" ON public.email_history;
DROP POLICY IF EXISTS "Teachers can insert email history" ON public.email_history;
DROP POLICY IF EXISTS "Teachers can view own email history" ON public.email_history;

CREATE POLICY "Admins can view all email history"
ON public.email_history
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert email history"
ON public.email_history
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Teachers can view own email history"
ON public.email_history
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND sender_id::text = current_setting('app.current_teacher_id', true)
);

CREATE POLICY "Teachers can insert email history"
ON public.email_history
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
  AND sender_id::text = current_setting('app.current_teacher_id', true)
);

-- ========== email_templates ==========
DROP POLICY IF EXISTS "Admins can insert email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can update email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can view all email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Teachers can view email templates" ON public.email_templates;

CREATE POLICY "Admins can view all email templates"
ON public.email_templates
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Teachers can view email templates"
ON public.email_templates
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
);

-- ========== merits ==========
DROP POLICY IF EXISTS "Admins can insert merits" ON public.merits;
DROP POLICY IF EXISTS "Admins have full access to merits" ON public.merits;
DROP POLICY IF EXISTS "Teachers can view all merits" ON public.merits;

CREATE POLICY "Admins can view all merits"
ON public.merits
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert merits"
ON public.merits
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can update merits"
ON public.merits
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete merits"
ON public.merits
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Teachers can view all merits"
ON public.merits
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
);

-- ========== monthly ==========
DROP POLICY IF EXISTS "Admins can insert monthly" ON public.monthly;
DROP POLICY IF EXISTS "Admins have full access to monthly" ON public.monthly;
DROP POLICY IF EXISTS "Teachers can view all monthly" ON public.monthly;

CREATE POLICY "Admins can view all monthly"
ON public.monthly
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can insert monthly"
ON public.monthly
FOR INSERT
TO anon, authenticated
WITH CHECK (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can update monthly"
ON public.monthly
FOR UPDATE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Admins can delete monthly"
ON public.monthly
FOR DELETE
TO anon, authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) <> ''
);

CREATE POLICY "Teachers can view all monthly"
ON public.monthly
FOR SELECT
TO anon, authenticated
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) <> ''
);