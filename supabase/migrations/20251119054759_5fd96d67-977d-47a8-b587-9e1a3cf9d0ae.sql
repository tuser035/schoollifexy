-- Add RLS policy for teachers to insert counseling records
CREATE POLICY "Teachers can insert counseling records"
ON public.career_counseling
FOR INSERT
WITH CHECK (
  (current_setting('app.current_teacher_id', true) IS NOT NULL) 
  AND (current_setting('app.current_teacher_id', true) <> '')
  AND ((admin_id)::text = current_setting('app.current_teacher_id', true))
);