-- 학생이 교사 정보를 조회할 수 있도록 RLS 정책 추가
CREATE POLICY "Students can view teachers" 
ON public.teachers 
FOR SELECT 
USING (
  (current_setting('app.current_student_id', true) IS NOT NULL) 
  AND (current_setting('app.current_student_id', true) <> '')
);