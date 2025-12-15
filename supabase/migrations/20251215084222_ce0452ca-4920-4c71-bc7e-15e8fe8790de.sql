-- 모든 email-attachments 관련 정책 삭제
DROP POLICY IF EXISTS "Teachers can upload email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to email-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload email attachments" ON storage.objects;

-- 모든 사용자가 email-attachments 버킷에 업로드할 수 있는 정책 (RLS 우회)
CREATE POLICY "Allow all uploads to email-attachments"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'email-attachments');

-- SELECT 정책도 추가 (다운로드 허용)
CREATE POLICY "Allow all downloads from email-attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'email-attachments');