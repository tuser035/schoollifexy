-- Update admin_insert_student RPC function to support UPSERT
CREATE OR REPLACE FUNCTION public.admin_insert_student(
  admin_id_input uuid,
  student_id_input text,
  name_input text,
  grade_input integer,
  class_input integer,
  number_input integer,
  dept_code_input text DEFAULT NULL,
  student_call_input text DEFAULT NULL,
  gmail_input text DEFAULT NULL,
  parents_call1_input text DEFAULT NULL,
  parents_call2_input text DEFAULT NULL
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

  -- Insert or update student row (UPSERT)
  INSERT INTO public.students (
    student_id, name, grade, class, number, dept_code, 
    student_call, gmail, parents_call1, parents_call2
  ) VALUES (
    student_id_input, name_input, grade_input, class_input, number_input, 
    dept_code_input, student_call_input, gmail_input, parents_call1_input, parents_call2_input
  )
  ON CONFLICT (student_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    grade = EXCLUDED.grade,
    class = EXCLUDED.class,
    number = EXCLUDED.number,
    dept_code = EXCLUDED.dept_code,
    student_call = EXCLUDED.student_call,
    gmail = EXCLUDED.gmail,
    parents_call1 = EXCLUDED.parents_call1,
    parents_call2 = EXCLUDED.parents_call2,
    updated_at = now()
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;