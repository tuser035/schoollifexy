-- Drop and recreate the insert policy for monthly table
DROP POLICY IF EXISTS "Teachers can insert monthly recommendations" ON public.monthly;

-- Create a simpler insert policy that allows inserts when teacher_id matches session
CREATE POLICY "Teachers can insert monthly recommendations"
ON public.monthly
FOR INSERT
WITH CHECK (
  teacher_id IS NOT NULL AND
  (
    (teacher_id)::text = current_setting('app.current_teacher_id'::text, true) OR
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (admins.id)::text = current_setting('app.current_admin_id'::text, true)
    )
  )
);