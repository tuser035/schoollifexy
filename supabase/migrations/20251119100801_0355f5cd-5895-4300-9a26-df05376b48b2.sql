-- student_id 비교 문제 해결을 위해 RLS 정책 수정
-- merits 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Students can view own merits" ON public.merits;
CREATE POLICY "Students can view own merits" 
ON public.merits 
FOR SELECT 
USING (
  student_id = current_setting('app.current_student_id', true)
);

-- demerits 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Students can view own demerits" ON public.demerits;
CREATE POLICY "Students can view own demerits" 
ON public.demerits 
FOR SELECT 
USING (
  student_id = current_setting('app.current_student_id', true)
);

-- monthly 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "Students can view own monthly" ON public.monthly;
CREATE POLICY "Students can view own monthly" 
ON public.monthly 
FOR SELECT 
USING (
  student_id = current_setting('app.current_student_id', true)
);