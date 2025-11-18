-- Drop insecure anonymous login policies
DROP POLICY IF EXISTS "Allow anonymous login for students" ON public.students;
DROP POLICY IF EXISTS "Allow anonymous login for teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow anonymous login for admins" ON public.admins;

-- Create secure login function for students (only verifies and sets session)
CREATE OR REPLACE FUNCTION public.student_login(
  student_id_input text,
  password_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash text;
BEGIN
  -- Get password hash
  SELECT password_hash INTO stored_hash
  FROM public.students
  WHERE student_id = student_id_input;
  
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify password
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    RETURN false;
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_student_id', student_id_input, false);
  
  RETURN true;
END;
$$;

-- Create secure login function for teachers (only verifies and sets session)
CREATE OR REPLACE FUNCTION public.teacher_login(
  phone_input text,
  password_input text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash text;
  teacher_id_val uuid;
BEGIN
  -- Get password hash and teacher id
  SELECT password_hash, id INTO stored_hash, teacher_id_val
  FROM public.teachers
  WHERE call_t = phone_input;
  
  IF stored_hash IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Verify password
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    RETURN NULL;
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_teacher_id', teacher_id_val::text, false);
  
  RETURN teacher_id_val;
END;
$$;

-- Create secure login function for admins (only verifies and sets session)
CREATE OR REPLACE FUNCTION public.admin_login(
  email_input text,
  password_input text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash text;
  admin_id_val uuid;
BEGIN
  -- Get password hash and admin id
  SELECT password_hash, id INTO stored_hash, admin_id_val
  FROM public.admins
  WHERE email = email_input;
  
  IF stored_hash IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Verify password
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    RETURN NULL;
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_val::text, false);
  
  RETURN admin_id_val;
END;
$$;