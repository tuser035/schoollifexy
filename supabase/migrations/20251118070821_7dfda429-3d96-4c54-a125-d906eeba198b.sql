-- Drop existing insecure anonymous access policies
DROP POLICY IF EXISTS "Allow anonymous login for students" ON public.students;
DROP POLICY IF EXISTS "Allow anonymous access for teacher login" ON public.teachers;
DROP POLICY IF EXISTS "Allow anonymous access for admin login" ON public.admins;

-- Drop existing login functions
DROP FUNCTION IF EXISTS public.student_login(text, text);
DROP FUNCTION IF EXISTS public.teacher_login(text, text);
DROP FUNCTION IF EXISTS public.admin_login(text, text);

-- Create secure login functions that bypass RLS using SECURITY DEFINER

-- Student login function
CREATE FUNCTION public.student_login(
  student_id_input TEXT,
  password_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  student_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get student record
  SELECT * INTO student_record
  FROM public.students
  WHERE student_id = student_id_input;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '학생을 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := student_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_student_id', student_id_input, false);
  
  -- Return student data (excluding password)
  RETURN json_build_object(
    'id', student_record.id,
    'student_id', student_record.student_id,
    'name', student_record.name,
    'grade', student_record.grade,
    'class', student_record.class
  );
END;
$$;

-- Teacher login function
CREATE FUNCTION public.teacher_login(
  phone_input TEXT,
  password_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  teacher_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get teacher record
  SELECT * INTO teacher_record
  FROM public.teachers
  WHERE call_t = phone_input;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '교사를 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := teacher_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_teacher_id', teacher_record.id::text, false);
  
  -- Return teacher data (excluding password)
  RETURN json_build_object(
    'id', teacher_record.id,
    'name', teacher_record.name,
    'email', teacher_record.teacher_email,
    'is_homeroom', teacher_record.is_homeroom,
    'grade', teacher_record.grade,
    'class', teacher_record.class
  );
END;
$$;

-- Admin login function
CREATE FUNCTION public.admin_login(
  email_input TEXT,
  password_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  admin_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get admin record
  SELECT * INTO admin_record
  FROM public.admins
  WHERE email = email_input;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '관리자를 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := admin_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_admin_id', admin_record.id::text, false);
  
  -- Return admin data (excluding password)
  RETURN json_build_object(
    'id', admin_record.id,
    'email', admin_record.email
  );
END;
$$;