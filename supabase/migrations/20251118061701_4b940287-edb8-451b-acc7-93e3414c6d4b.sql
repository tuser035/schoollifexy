-- Fix admins SELECT policy to work without Supabase Auth role requirement
DROP POLICY IF EXISTS "admins_select_own" ON public.admins;

CREATE POLICY "admins_select_own"
ON public.admins
FOR SELECT
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) <> ''
  AND (id)::text = current_setting('app.current_admin_id', true)
);