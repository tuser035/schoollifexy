-- Drop existing RLS policies for email_history
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.email_history;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.email_history;

-- Create new RLS policies for email_history
-- Allow admins and teachers to read email history
CREATE POLICY "Allow admins and teachers to read email history"
ON public.email_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true)
  )
  OR
  EXISTS (
    SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true)
  )
);

-- Allow admins and teachers to insert email history
CREATE POLICY "Allow admins and teachers to insert email history"
ON public.email_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins WHERE id::text = sender_id::text
  )
  OR
  EXISTS (
    SELECT 1 FROM public.teachers WHERE id::text = sender_id::text
  )
);