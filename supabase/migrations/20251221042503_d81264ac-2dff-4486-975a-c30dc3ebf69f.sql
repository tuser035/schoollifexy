-- system_settings에서 공개 설정들 (school_symbol_url, favicon_url)은 누구나 조회 가능하도록 정책 추가
CREATE POLICY "Anyone can view public settings"
ON public.system_settings
FOR SELECT
USING (setting_key IN ('school_symbol_url', 'favicon_url', 'school_name'));

-- school-symbols 스토리지 버킷의 RLS 정책 추가 (관리자만 업로드/수정/삭제 가능)
CREATE POLICY "Admins can upload school symbols"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'school-symbols' 
  AND EXISTS (SELECT 1 FROM public.admins WHERE id = (current_setting('app.current_admin_id', true))::uuid)
);

CREATE POLICY "Admins can update school symbols"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'school-symbols' 
  AND EXISTS (SELECT 1 FROM public.admins WHERE id = (current_setting('app.current_admin_id', true))::uuid)
);

CREATE POLICY "Admins can delete school symbols"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'school-symbols' 
  AND EXISTS (SELECT 1 FROM public.admins WHERE id = (current_setting('app.current_admin_id', true))::uuid)
);