-- counseling-attachments 버킷의 RLS 정책 완전 제거 (커스텀 인증 사용 중이므로)

-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their attachments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can read attachments" ON storage.objects;

-- anon 역할(미인증 사용자)에게도 업로드 및 읽기 권한 부여
-- 버킷이 public이고 커스텀 인증을 사용하므로 anon 역할 허용 필요
CREATE POLICY "Allow anon to upload to counseling-attachments"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'counseling-attachments');

CREATE POLICY "Allow anon to read from counseling-attachments"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'counseling-attachments');

CREATE POLICY "Allow anon to delete from counseling-attachments"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'counseling-attachments');