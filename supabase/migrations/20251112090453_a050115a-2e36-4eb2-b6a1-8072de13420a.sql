-- Fix crypt() not found by ensuring extensions schema in search_path
CREATE OR REPLACE FUNCTION public.verify_admin_password(email_input text, password_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.admins
  WHERE email = email_input;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = extensions.crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_student_password(student_id_input text, password_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.students
  WHERE student_id = student_id_input;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = extensions.crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_teacher_password(phone_input text, password_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.teachers
  WHERE call_t = phone_input;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = extensions.crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_password(student_id_input text, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.students
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE student_id = student_id_input;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_teacher_password(teacher_id_input uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.teachers
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = teacher_id_input;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admin_password(admin_id_input uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.admins
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = admin_id_input;
  
  RETURN FOUND;
END;
$$;