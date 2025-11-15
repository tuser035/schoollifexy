-- Fix email_templates RLS policies for INSERT
DROP POLICY IF EXISTS "Admins can insert email templates" ON email_templates;

-- Allow insert if admin_id exists in admins table
CREATE POLICY "Admins can insert email templates"
ON email_templates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.id = email_templates.admin_id
  )
);