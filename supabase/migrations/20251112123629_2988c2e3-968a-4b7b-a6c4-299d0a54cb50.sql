-- Add DELETE policy for career_counseling table
CREATE POLICY "Admins can delete counseling records"
ON public.career_counseling
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);