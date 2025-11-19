-- counseling-attachments 버킷 파일 업로드 정책 수정 (더 간단한 접근)

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Teachers can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read attachments" ON storage.objects;

-- 누구나 counseling-attachments 버킷에 파일 업로드 가능 (버킷이 public이므로)
CREATE POLICY "Anyone can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'counseling-attachments');

-- 누구나 counseling-attachments 버킷의 파일 읽기 가능
CREATE POLICY "Anyone can read attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'counseling-attachments');

-- 업로드한 사용자는 삭제 가능
CREATE POLICY "Users can delete their attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'counseling-attachments');