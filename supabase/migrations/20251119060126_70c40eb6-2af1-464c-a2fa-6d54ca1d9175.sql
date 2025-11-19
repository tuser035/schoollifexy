-- Drop the existing policy
DROP POLICY IF EXISTS "Admins and teachers can insert counseling records" ON public.career_counseling;

-- Create a simpler policy that just checks if admin or teacher session is set
CREATE POLICY "Admins and teachers can insert counseling records"
ON public.career_counseling
FOR INSERT
WITH CHECK (
  (current_setting('app.current_admin_id', true) IS NOT NULL AND current_setting('app.current_admin_id', true) <> '') 
  OR 
  (current_setting('app.current_teacher_id', true) IS NOT NULL AND current_setting('app.current_teacher_id', true) <> '')
);