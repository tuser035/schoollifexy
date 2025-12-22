-- RLS 정책 추가: poetry_recordings
CREATE POLICY "Students can insert own recordings"
ON public.poetry_recordings FOR INSERT
WITH CHECK (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can view own recordings"
ON public.poetry_recordings FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Admins can view all recordings"
ON public.poetry_recordings FOR SELECT
USING (current_setting('app.current_admin_id', true) IS NOT NULL AND current_setting('app.current_admin_id', true) <> '');

CREATE POLICY "Teachers can view all recordings"
ON public.poetry_recordings FOR SELECT
USING (current_setting('app.current_teacher_id', true) IS NOT NULL AND current_setting('app.current_teacher_id', true) <> '');

-- RLS 정책 추가: poetry_completion_bonus
CREATE POLICY "Students can view own completion bonus"
ON public.poetry_completion_bonus FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Admins can view all completion bonus"
ON public.poetry_completion_bonus FOR SELECT
USING (current_setting('app.current_admin_id', true) IS NOT NULL AND current_setting('app.current_admin_id', true) <> '');

CREATE POLICY "Teachers can view all completion bonus"
ON public.poetry_completion_bonus FOR SELECT
USING (current_setting('app.current_teacher_id', true) IS NOT NULL AND current_setting('app.current_teacher_id', true) <> '');