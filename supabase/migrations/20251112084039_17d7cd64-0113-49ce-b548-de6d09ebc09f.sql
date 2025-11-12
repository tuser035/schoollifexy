-- Fix security: Add search_path to all authentication functions
CREATE OR REPLACE FUNCTION public.verify_student_password(student_id_input TEXT, password_input TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
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
  
  RETURN stored_hash = crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_teacher_password(phone_input TEXT, password_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  RETURN stored_hash = crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_password(email_input TEXT, password_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  RETURN stored_hash = crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_student_session(student_id_input TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_teacher_session(teacher_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_session(admin_id_input UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_admin_id', admin_id_input::text, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_student_password(student_id_input TEXT, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.students
  SET password_hash = crypt(new_password, gen_salt('bf'))
  WHERE student_id = student_id_input;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_teacher_password(teacher_id_input UUID, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teachers
  SET password_hash = crypt(new_password, gen_salt('bf'))
  WHERE id = teacher_id_input;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admin_password(admin_id_input UUID, new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.admins
  SET password_hash = crypt(new_password, gen_salt('bf'))
  WHERE id = admin_id_input;
  
  RETURN FOUND;
END;
$$;
