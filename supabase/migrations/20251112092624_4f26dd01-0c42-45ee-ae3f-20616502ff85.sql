-- Add UPDATE policy for departments table to allow admins to update
CREATE POLICY "Admins can update departments" 
ON public.departments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id'::text, true)
  )
);

-- Add DELETE policy for departments table to allow admins to delete
CREATE POLICY "Admins can delete departments" 
ON public.departments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id'::text, true)
  )
);