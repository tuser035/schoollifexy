-- 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view counseling attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload counseling attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete counseling attachments" ON storage.objects;

-- public으로 정책 재생성 (커스텀 인증 사용)
CREATE POLICY "Admins can view counseling attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'counseling-attachments' AND
  (current_setting('app.current_admin_id', true) IS NOT NULL AND
   current_setting('app.current_admin_id', true) <> '')
);

CREATE POLICY "Admins can upload counseling attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'counseling-attachments' AND
  (current_setting('app.current_admin_id', true) IS NOT NULL AND
   current_setting('app.current_admin_id', true) <> '')
);

CREATE POLICY "Admins can delete counseling attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'counseling-attachments' AND
  (current_setting('app.current_admin_id', true) IS NOT NULL AND
   current_setting('app.current_admin_id', true) <> '')
);