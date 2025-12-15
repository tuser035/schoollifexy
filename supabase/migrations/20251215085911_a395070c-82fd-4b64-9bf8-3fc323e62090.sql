-- 기존 email-attachments 관련 모든 정책 삭제
DROP POLICY IF EXISTS "Public upload to email-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public download from email-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view email attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to email-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all downloads from email-attachments" ON storage.objects;

-- 완전 개방 정책 생성 (조건 없이)
CREATE POLICY "email_attachments_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "email_attachments_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-attachments');