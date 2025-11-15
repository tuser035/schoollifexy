-- Create function to insert teachers under admin session to satisfy RLS in a single call
CREATE OR REPLACE FUNCTION public.admin_insert_teacher(
  admin_id_input uuid,
  name_input text,
  call_t_input text,
  teacher_email_input text,
  grade_input integer DEFAULT NULL,
  class_input integer DEFAULT NULL,
  is_homeroom_input boolean DEFAULT false,
  dept_code_input text DEFAULT NULL,
  department_input text DEFAULT NULL,
  subject_input text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session context for RLS
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert teacher row
  INSERT INTO public.teachers (
    name, call_t, teacher_email, grade, class, is_homeroom, dept_code, department, subject
  ) VALUES (
    name_input, call_t_input, teacher_email_input, grade_input, class_input, is_homeroom_input, dept_code_input, department_input, subject_input
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;