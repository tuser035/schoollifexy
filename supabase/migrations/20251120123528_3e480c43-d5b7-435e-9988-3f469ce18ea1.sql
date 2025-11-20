-- Create RPC function for inserting departments
CREATE OR REPLACE FUNCTION public.admin_insert_department(
  admin_id_input uuid,
  code_input text,
  name_input text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_dept_id uuid;
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert or update department (upsert on conflict)
  INSERT INTO public.departments (code, name)
  VALUES (code_input, name_input)
  ON CONFLICT (code) DO UPDATE 
  SET name = EXCLUDED.name
  RETURNING id INTO new_dept_id;

  RETURN new_dept_id;
END;
$$;

-- Create RPC function for inserting career counseling
CREATE OR REPLACE FUNCTION public.admin_insert_career_counseling(
  admin_id_input uuid,
  student_id_input text,
  counselor_name_input text,
  counseling_date_input date,
  content_input text,
  attachment_url_input text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_counseling_id uuid;
BEGIN
  -- Verify admin or teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert career counseling
  INSERT INTO public.career_counseling (
    admin_id, student_id, counselor_name, counseling_date, content, attachment_url
  )
  VALUES (
    admin_id_input, student_id_input, counselor_name_input, 
    counseling_date_input, content_input, attachment_url_input
  )
  RETURNING id INTO new_counseling_id;

  RETURN new_counseling_id;
END;
$$;

-- Create RPC function for inserting email templates
CREATE OR REPLACE FUNCTION public.admin_insert_email_template_bulk(
  admin_id_input uuid,
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
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert email template
  INSERT INTO public.email_templates (admin_id, title, subject, body, template_type)
  VALUES (
    admin_id_input, title_input, subject_input, body_input, template_type_input::template_type
  )
  RETURNING id INTO new_template_id;

  RETURN new_template_id;
END;
$$;

-- Create RPC function for inserting email history
CREATE OR REPLACE FUNCTION public.admin_insert_email_history(
  admin_id_input uuid,
  sender_id_input uuid,
  sender_name_input text,
  sender_type_input text,
  recipient_email_input text,
  recipient_name_input text,
  recipient_student_id_input text,
  subject_input text,
  body_input text,
  resend_email_id_input text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_history_id uuid;
BEGIN
  -- Verify admin or teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert email history
  INSERT INTO public.email_history (
    sender_id, sender_name, sender_type, recipient_email, recipient_name,
    recipient_student_id, subject, body, resend_email_id
  )
  VALUES (
    sender_id_input, sender_name_input, sender_type_input, recipient_email_input,
    recipient_name_input, recipient_student_id_input, subject_input, body_input,
    resend_email_id_input
  )
  RETURNING id INTO new_history_id;

  RETURN new_history_id;
END;
$$;

-- Create RPC function for inserting file metadata
CREATE OR REPLACE FUNCTION public.admin_insert_file_metadata(
  admin_id_input uuid,
  bucket_name_input text,
  storage_path_input text,
  original_filename_input text,
  mime_type_input text DEFAULT NULL,
  file_size_input bigint DEFAULT NULL,
  uploaded_by_input uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_metadata_id uuid;
BEGIN
  -- Verify admin or teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert file metadata
  INSERT INTO public.file_metadata (
    bucket_name, storage_path, original_filename, mime_type, file_size, uploaded_by
  )
  VALUES (
    bucket_name_input, storage_path_input, original_filename_input,
    mime_type_input, file_size_input, uploaded_by_input
  )
  RETURNING id INTO new_metadata_id;

  RETURN new_metadata_id;
END;
$$;