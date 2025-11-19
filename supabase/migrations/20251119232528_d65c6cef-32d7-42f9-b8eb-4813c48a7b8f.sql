-- Update admin_login function to accept email or phone
CREATE OR REPLACE FUNCTION public.admin_login(email_or_phone_input text, password_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  admin_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get admin record by email or phone
  SELECT * INTO admin_record
  FROM public.admins
  WHERE email = email_or_phone_input 
    OR call_a = email_or_phone_input;
  
  IF NOT FOUND THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      email_or_phone_input,
      'admin',
      'login_failed',
      'admins',
      NULL,
      NULL,
      NULL,
      'failed',
      '관리자를 찾을 수 없습니다'
    );
    RAISE EXCEPTION '관리자를 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := admin_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      admin_record.id::text,
      'admin',
      'login_failed',
      'admins',
      admin_record.id::text,
      NULL,
      NULL,
      'failed',
      '비밀번호가 일치하지 않습니다'
    );
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_admin_id', admin_record.id::text, false);
  
  -- Log successful login
  PERFORM log_audit_event(
    admin_record.id::text,
    'admin',
    'login_success',
    'admins',
    admin_record.id::text
  );
  
  -- Return admin data (excluding password) with name
  RETURN json_build_object(
    'id', admin_record.id,
    'email', admin_record.email,
    'name', admin_record.name
  );
END;
$function$;