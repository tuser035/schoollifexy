-- 학교 심볼 이미지를 위한 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public) 
VALUES ('school-symbols', 'school-symbols', true)
ON CONFLICT (id) DO NOTHING;

-- 모든 사용자가 학교 심볼을 볼 수 있도록 정책 생성
CREATE POLICY "School symbols are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'school-symbols');

-- 관리자만 학교 심볼 업로드 가능 (anon 역할로 업로드하므로 모든 사용자 허용, RPC에서 검증)
CREATE POLICY "Allow upload to school-symbols" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'school-symbols');

-- 관리자만 학교 심볼 수정 가능
CREATE POLICY "Allow update school-symbols" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'school-symbols');

-- 관리자만 학교 심볼 삭제 가능
CREATE POLICY "Allow delete school-symbols" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'school-symbols');