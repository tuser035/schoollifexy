-- 교사 비밀번호 재설정 함수 (전화번호 기반)
CREATE OR REPLACE FUNCTION public.reset_teacher_password_by_phone(
  admin_id_input uuid,
  phone_input text,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  teacher_record RECORD;
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input AND is_admin = true) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 전화번호로 교사 조회
  SELECT id INTO teacher_record
  FROM public.teachers
  WHERE call_t = phone_input;

  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 전화번호로 등록된 교사를 찾을 수 없습니다';
  END IF;

  -- 비밀번호 업데이트
  UPDATE public.teachers
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = teacher_record.id;

  RETURN true;
END;
$$;

-- 교사 관리자 비밀번호 재설정 함수 (전화번호 기반)
CREATE OR REPLACE FUNCTION public.reset_admin_teacher_password_by_phone(
  admin_id_input uuid,
  phone_input text,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  teacher_record RECORD;
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input AND is_admin = true) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 전화번호와 is_admin=true로 교사 조회
  SELECT id INTO teacher_record
  FROM public.teachers
  WHERE call_t = phone_input AND is_admin = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 전화번호로 등록된 관리자를 찾을 수 없습니다';
  END IF;

  -- 비밀번호 업데이트
  UPDATE public.teachers
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = teacher_record.id;

  RETURN true;
END;
$$;