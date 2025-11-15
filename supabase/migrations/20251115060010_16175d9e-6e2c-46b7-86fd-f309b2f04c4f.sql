-- Fix email_templates INSERT RLS policy to use session context
DROP POLICY IF EXISTS "Admins can insert email templates" ON public.email_templates;

CREATE POLICY "Admins can insert email templates" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (
  (EXISTS (SELECT 1 FROM admins WHERE (admins.id)::text = current_setting('app.current_admin_id'::text, true)))
  AND ((admin_id)::text = current_setting('app.current_admin_id'::text, true))
);