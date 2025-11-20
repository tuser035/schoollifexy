-- teacher_login 함수를 수정하여 is_admin 필드 포함
CREATE OR REPLACE FUNCTION public.teacher_login(phone_input text, password_input text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  teacher_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get teacher record
  SELECT * INTO teacher_record
  FROM public.teachers
  WHERE call_t = phone_input;
  
  IF NOT FOUND THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      phone_input,
      'teacher',
      'login_failed',
      'teachers',
      NULL,
      NULL,
      NULL,
      'failed',
      '교사를 찾을 수 없습니다'
    );
    RAISE EXCEPTION '교사를 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := teacher_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      teacher_record.id::text,
      'teacher',
      'login_failed',
      'teachers',
      teacher_record.id::text,
      NULL,
      NULL,
      'failed',
      '비밀번호가 일치하지 않습니다'
    );
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_teacher_id', teacher_record.id::text, false);
  
  -- Log successful login
  PERFORM log_audit_event(
    teacher_record.id::text,
    'teacher',
    'login_success',
    'teachers',
    teacher_record.id::text
  );
  
  -- Return teacher data (excluding password) - is_admin 필드 추가
  RETURN json_build_object(
    'id', teacher_record.id,
    'name', teacher_record.name,
    'email', teacher_record.teacher_email,
    'is_homeroom', teacher_record.is_homeroom,
    'is_admin', teacher_record.is_admin,
    'grade', teacher_record.grade,
    'class', teacher_record.class
  );
END;
$function$;