-- counseling-attachments 버킷에 교사도 파일 업로드할 수 있도록 RLS 정책 추가

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Teachers can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can read attachments" ON storage.objects;

-- 교사가 counseling-attachments 버킷에 파일 업로드 가능하도록 정책 추가
CREATE POLICY "Teachers can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'counseling-attachments' 
  AND (
    -- 관리자 체크
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id::text = current_setting('app.current_admin_id', true)
    )
    OR
    -- 교사 체크
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE id::text = current_setting('app.current_teacher_id', true)
    )
  )
);

-- 교사가 counseling-attachments 버킷의 파일을 읽을 수 있도록 정책 추가
CREATE POLICY "Teachers can read attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'counseling-attachments'
  AND (
    -- 관리자 체크
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id::text = current_setting('app.current_admin_id', true)
    )
    OR
    -- 교사 체크
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE id::text = current_setting('app.current_teacher_id', true)
    )
  )
);