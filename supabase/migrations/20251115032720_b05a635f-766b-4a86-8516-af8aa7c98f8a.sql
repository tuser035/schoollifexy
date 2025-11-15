-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view all templates
CREATE POLICY "Admins can view all email templates"
ON public.email_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Admins can insert templates
CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  ) AND admin_id::text = current_setting('app.current_admin_id', true)
);

-- Admins can update templates
CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Admins can delete templates
CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Teachers can view templates
CREATE POLICY "Teachers can view email templates"
ON public.email_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();