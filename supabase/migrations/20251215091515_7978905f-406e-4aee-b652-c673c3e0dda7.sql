-- 시스템 설정 테이블 생성
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정 가능
CREATE POLICY "Admins can view system settings"
  ON public.system_settings
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = current_setting('app.current_admin_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.teachers WHERE id = current_setting('app.current_admin_id', true)::uuid)
    OR EXISTS (SELECT 1 FROM public.teachers WHERE id = current_setting('app.current_teacher_id', true)::uuid)
  );

CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = current_setting('app.current_admin_id', true)::uuid));

CREATE POLICY "Admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE id = current_setting('app.current_admin_id', true)::uuid));

-- 기본 답장 이메일 주소 설정 추가
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('reply_to_email', 'gyeongjuhs@naver.com', '이메일 발송 시 답장 받을 주소');

-- 설정 조회 함수 (Edge Function에서 사용)
CREATE OR REPLACE FUNCTION public.get_system_setting(setting_key_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (SELECT setting_value FROM public.system_settings WHERE setting_key = setting_key_input);
END;
$$;

-- 관리자용 설정 업데이트 함수
CREATE OR REPLACE FUNCTION public.admin_update_system_setting(
  admin_id_input uuid,
  setting_key_input text,
  setting_value_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- 설정 업데이트 또는 삽입
  INSERT INTO public.system_settings (setting_key, setting_value, updated_by)
  VALUES (setting_key_input, setting_value_input, admin_id_input)
  ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      updated_by = EXCLUDED.updated_by,
      updated_at = now();

  RETURN true;
END;
$$;

-- 관리자용 설정 조회 함수
CREATE OR REPLACE FUNCTION public.admin_get_system_settings(admin_id_input uuid)
RETURNS TABLE(
  id uuid,
  setting_key text,
  setting_value text,
  description text,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  RETURN QUERY
  SELECT s.id, s.setting_key, s.setting_value, s.description, s.updated_at
  FROM public.system_settings s
  ORDER BY s.setting_key;
END;
$$;