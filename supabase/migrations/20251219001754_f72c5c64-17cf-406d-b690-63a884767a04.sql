-- mindtalk_messages 테이블 RLS 정책 추가
-- 학생: 본인 메시지만 조회/입력 가능
-- 교사: 접근 불가 (함수 통해서만 접근)
-- 관리자: 전체 조회 가능

CREATE POLICY "Students can view own mindtalk messages"
ON public.mindtalk_messages
FOR SELECT
USING (student_id = current_setting('app.current_student_id'::text, true));

CREATE POLICY "Students can insert own mindtalk messages"
ON public.mindtalk_messages
FOR INSERT
WITH CHECK (student_id = current_setting('app.current_student_id'::text, true));

CREATE POLICY "Admins can view all mindtalk messages"
ON public.mindtalk_messages
FOR SELECT
USING (
  current_setting('app.current_admin_id'::text, true) IS NOT NULL 
  AND current_setting('app.current_admin_id'::text, true) <> ''::text
);

-- mindtalk_alerts 테이블 RLS 정책 추가
-- 학생: 접근 불가
-- 교사: 접근 불가
-- 관리자: 전체 접근 가능

CREATE POLICY "Admins can view all mindtalk alerts"
ON public.mindtalk_alerts
FOR SELECT
USING (
  current_setting('app.current_admin_id'::text, true) IS NOT NULL 
  AND current_setting('app.current_admin_id'::text, true) <> ''::text
);

CREATE POLICY "Admins can update mindtalk alerts"
ON public.mindtalk_alerts
FOR UPDATE
USING (
  current_setting('app.current_admin_id'::text, true) IS NOT NULL 
  AND current_setting('app.current_admin_id'::text, true) <> ''::text
);

CREATE POLICY "System can insert mindtalk alerts"
ON public.mindtalk_alerts
FOR INSERT
WITH CHECK (true);