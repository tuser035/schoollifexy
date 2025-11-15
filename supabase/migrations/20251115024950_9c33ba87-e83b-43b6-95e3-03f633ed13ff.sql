-- Fix email_history RLS policies for teachers
DROP POLICY IF EXISTS "Teachers can insert email history" ON public.email_history;

-- Create simpler policy that allows teachers to insert their own records
CREATE POLICY "Teachers can insert email history"
  ON public.email_history
  FOR INSERT
  WITH CHECK (
    sender_type = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE id = sender_id
    )
  );