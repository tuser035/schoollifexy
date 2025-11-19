-- admins 테이블에 전화번호 컬럼 추가
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS call_a text UNIQUE;

-- 기존 admin_login 함수 삭제
DROP FUNCTION IF EXISTS public.admin_login(text, text);

-- admin_login 함수를 이메일 또는 전화번호로 로그인 가능하도록 재생성
CREATE FUNCTION public.admin_login(email_or_phone_input text, password_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  admin_record RECORD;
  stored_hash TEXT;
  is_email BOOLEAN;
BEGIN
  -- 입력값이 이메일인지 전화번호인지 판단 (@ 포함 여부로 판단)
  is_email := email_or_phone_input LIKE '%@%';
  
  -- Get admin record (이메일 또는 전화번호로 검색)
  IF is_email THEN
    SELECT * INTO admin_record
    FROM public.admins
    WHERE email = email_or_phone_input;
  ELSE
    SELECT * INTO admin_record
    FROM public.admins
    WHERE call_a = email_or_phone_input;
  END IF;
  
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
$$;