-- Fix teachers_select_all_students policy to avoid recursive RLS
-- Remove the EXISTS clause that causes permission denied error

DROP POLICY IF EXISTS "teachers_select_all_students" ON public.students;

CREATE POLICY "teachers_select_all_students" ON public.students
FOR SELECT 
USING (
  (current_setting('app.current_teacher_id', true) IS NOT NULL) 
  AND (current_setting('app.current_teacher_id', true) <> ''::text)
);