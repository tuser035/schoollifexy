-- evidence-photos 버킷에 대한 RLS 정책 생성
-- 관리자가 모든 파일을 조회할 수 있도록 허용
CREATE POLICY "Admins can view all files in evidence-photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evidence-photos' 
  AND (
    current_setting('app.current_admin_id', true) IS NOT NULL 
    AND current_setting('app.current_admin_id', true) != ''
  )
);

-- 관리자가 파일을 삭제할 수 있도록 허용
CREATE POLICY "Admins can delete files in evidence-photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidence-photos' 
  AND (
    current_setting('app.current_admin_id', true) IS NOT NULL 
    AND current_setting('app.current_admin_id', true) != ''
  )
);

-- 교사가 자신이 업로드한 파일을 조회할 수 있도록 허용
CREATE POLICY "Teachers can view own files in evidence-photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evidence-photos' 
  AND (
    current_setting('app.current_teacher_id', true) IS NOT NULL 
    AND current_setting('app.current_teacher_id', true) != ''
    AND owner::text = current_setting('app.current_teacher_id', true)
  )
);

-- 교사와 관리자가 파일을 업로드할 수 있도록 허용
CREATE POLICY "Teachers and admins can upload files to evidence-photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidence-photos' 
  AND (
    (current_setting('app.current_teacher_id', true) IS NOT NULL AND current_setting('app.current_teacher_id', true) != '')
    OR (current_setting('app.current_admin_id', true) IS NOT NULL AND current_setting('app.current_admin_id', true) != '')
  )
);