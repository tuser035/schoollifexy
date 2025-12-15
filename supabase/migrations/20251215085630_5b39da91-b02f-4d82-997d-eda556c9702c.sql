-- 기존 email-attachments 관련 정책 삭제
DROP POLICY IF EXISTS "Allow all uploads to email-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all downloads from email-attachments" ON storage.objects;

-- anon과 authenticated 역할 모두에게 업로드 허용
CREATE POLICY "Public upload to email-attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'email-attachments');

-- anon과 authenticated 역할 모두에게 다운로드 허용
CREATE POLICY "Public download from email-attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'email-attachments');