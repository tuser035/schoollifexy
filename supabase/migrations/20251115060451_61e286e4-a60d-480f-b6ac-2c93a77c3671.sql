-- Drop existing RLS policy that relies on session variable
DROP POLICY IF EXISTS "Admins can insert email templates" ON public.email_templates;

-- Create a simpler RLS policy for INSERT that just checks admin exists
CREATE POLICY "Admins can insert email templates" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id)
);

-- Create RPC function for inserting email templates with proper session context
CREATE OR REPLACE FUNCTION admin_insert_email_template(
  admin_id_input text,
  title_input text,
  subject_input text,
  body_input text,
  template_type_input text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_template_id uuid;
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id::text = admin_id_input) THEN
    RAISE EXCEPTION 'Invalid admin ID';
  END IF;

  -- Set session context
  PERFORM set_config('app.current_admin_id', admin_id_input, true);

  -- Insert template
  INSERT INTO public.email_templates (admin_id, title, subject, body, template_type)
  VALUES (admin_id_input::uuid, title_input, subject_input, body_input, template_type_input::template_type)
  RETURNING id INTO new_template_id;

  RETURN new_template_id;
END;
$$;

-- Create RPC function for updating email templates
CREATE OR REPLACE FUNCTION admin_update_email_template(
  admin_id_input text,
  template_id_input text,
  title_input text,
  subject_input text,
  body_input text,
  template_type_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id::text = admin_id_input) THEN
    RAISE EXCEPTION 'Invalid admin ID';
  END IF;

  -- Set session context
  PERFORM set_config('app.current_admin_id', admin_id_input, true);

  -- Update template
  UPDATE public.email_templates
  SET 
    title = title_input,
    subject = subject_input,
    body = body_input,
    template_type = template_type_input::template_type,
    updated_at = now()
  WHERE id::text = template_id_input 
    AND admin_id::text = admin_id_input;

  RETURN FOUND;
END;
$$;

-- Create RPC function for deleting email templates
CREATE OR REPLACE FUNCTION admin_delete_email_template(
  admin_id_input text,
  template_id_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id::text = admin_id_input) THEN
    RAISE EXCEPTION 'Invalid admin ID';
  END IF;

  -- Set session context
  PERFORM set_config('app.current_admin_id', admin_id_input, true);

  -- Delete template
  DELETE FROM public.email_templates
  WHERE id::text = template_id_input 
    AND admin_id::text = admin_id_input;

  RETURN FOUND;
END;
$$;