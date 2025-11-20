-- Create function to delete all data from specified tables
CREATE OR REPLACE FUNCTION admin_delete_all_from_table(
  admin_id_input uuid,
  table_name_input text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Set admin session for RLS
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Delete based on table name
  CASE table_name_input
    WHEN 'students' THEN
      DELETE FROM public.students;
    WHEN 'teachers' THEN
      DELETE FROM public.teachers;
    WHEN 'departments' THEN
      DELETE FROM public.departments;
    WHEN 'merits' THEN
      DELETE FROM public.merits;
    WHEN 'demerits' THEN
      DELETE FROM public.demerits;
    WHEN 'monthly' THEN
      DELETE FROM public.monthly;
    WHEN 'career_counseling' THEN
      DELETE FROM public.career_counseling;
    WHEN 'email_templates' THEN
      DELETE FROM public.email_templates;
    WHEN 'email_history' THEN
      DELETE FROM public.email_history;
    WHEN 'student_groups' THEN
      DELETE FROM public.student_groups;
    WHEN 'teacher_groups' THEN
      DELETE FROM public.teacher_groups;
    WHEN 'file_metadata' THEN
      DELETE FROM public.file_metadata;
    ELSE
      RAISE EXCEPTION '유효하지 않은 테이블 이름입니다';
  END CASE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;