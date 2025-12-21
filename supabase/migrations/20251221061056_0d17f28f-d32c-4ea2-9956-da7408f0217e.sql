-- 기존 공개 설정 정책 삭제 후 카카오톡 관련 설정 추가
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.system_settings;

CREATE POLICY "Anyone can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (setting_key = ANY (ARRAY['school_symbol_url', 'favicon_url', 'school_name', 'school_name_en', 'kakao_qr_url', 'kakao_chat_url']));