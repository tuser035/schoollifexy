-- Drop existing insert policies for career_counseling
DROP POLICY IF EXISTS "Admins can insert counseling records" ON public.career_counseling;
DROP POLICY IF EXISTS "Teachers can insert counseling records" ON public.career_counseling;

-- Create unified policy for both admins and teachers to insert counseling records
CREATE POLICY "Admins and teachers can insert counseling records"
ON public.career_counseling
FOR INSERT
WITH CHECK (
  (
    -- Admin check
    (current_setting('app.current_admin_id', true) IS NOT NULL 
     AND current_setting('app.current_admin_id', true) <> ''
     AND (admin_id)::text = current_setting('app.current_admin_id', true))
  ) 
  OR 
  (
    -- Teacher check
    (current_setting('app.current_teacher_id', true) IS NOT NULL 
     AND current_setting('app.current_teacher_id', true) <> ''
     AND (admin_id)::text = current_setting('app.current_teacher_id', true))
  )
);