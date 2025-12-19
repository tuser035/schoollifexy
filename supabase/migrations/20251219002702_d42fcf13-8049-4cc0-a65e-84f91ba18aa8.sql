-- 기존 교사 접근 허용 정책 삭제 후 관리자만 허용하도록 재생성
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;

-- 관리자만 조회 가능하도록 정책 재생성
CREATE POLICY "Admins can view system settings"
ON public.system_settings
FOR SELECT
USING (
  current_setting('app.current_admin_id'::text, true) IS NOT NULL 
  AND current_setting('app.current_admin_id'::text, true) <> ''::text
);