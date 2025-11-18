-- Add SELECT policy for admins table
CREATE POLICY "admins_select_own"
ON public.admins
FOR SELECT
TO authenticated
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) != ''
  AND (id)::text = current_setting('app.current_admin_id', true)
);