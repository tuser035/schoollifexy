-- Update admin_insert_teacher RPC function to support UPSERT
CREATE OR REPLACE FUNCTION public.admin_insert_teacher(
  admin_id_input uuid,
  name_input text,
  call_t_input text,
  teacher_email_input text,
  grade_input integer DEFAULT NULL,
  class_input integer DEFAULT NULL,
  is_homeroom_input boolean DEFAULT false,
  is_admin_input boolean DEFAULT false,
  dept_code_input text DEFAULT NULL,
  department_input text DEFAULT NULL,
  subject_input text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id uuid;
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session context for RLS
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert or update teacher row (UPSERT)
  INSERT INTO public.teachers (
    name, call_t, teacher_email, grade, class, is_homeroom, is_admin, dept_code, department, subject
  ) VALUES (
    name_input, call_t_input, teacher_email_input, grade_input, class_input, is_homeroom_input, is_admin_input, dept_code_input, department_input, subject_input
  )
  ON CONFLICT (teacher_email) DO UPDATE
  SET
    name = EXCLUDED.name,
    call_t = EXCLUDED.call_t,
    grade = EXCLUDED.grade,
    class = EXCLUDED.class,
    is_homeroom = EXCLUDED.is_homeroom,
    is_admin = EXCLUDED.is_admin,
    dept_code = EXCLUDED.dept_code,
    department = EXCLUDED.department,
    subject = EXCLUDED.subject,
    updated_at = now()
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;