-- Fix admin_get_system_settings to set admin session for RLS
CREATE OR REPLACE FUNCTION public.admin_get_system_settings(admin_id_input uuid)
RETURNS TABLE(id uuid, setting_key text, setting_value text, description text, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Set admin session for RLS
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  RETURN QUERY
  SELECT s.id, s.setting_key, s.setting_value, s.description, s.updated_at
  FROM public.system_settings s
  ORDER BY s.setting_key;
END;
$$;