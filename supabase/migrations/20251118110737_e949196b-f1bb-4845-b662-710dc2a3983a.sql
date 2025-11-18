-- counseling-attachments 버킷에 대한 Storage RLS 정책 추가

-- 관리자는 모든 파일을 볼 수 있음
CREATE POLICY "Admins can view counseling attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'counseling-attachments' AND
  (current_setting('app.current_admin_id', true) IS NOT NULL AND
   current_setting('app.current_admin_id', true) <> '')
);

-- 관리자는 파일을 업로드할 수 있음
CREATE POLICY "Admins can upload counseling attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'counseling-attachments' AND
  (current_setting('app.current_admin_id', true) IS NOT NULL AND
   current_setting('app.current_admin_id', true) <> '')
);

-- 관리자는 파일을 삭제할 수 있음
CREATE POLICY "Admins can delete counseling attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'counseling-attachments' AND
  (current_setting('app.current_admin_id', true) IS NOT NULL AND
   current_setting('app.current_admin_id', true) <> '')
);