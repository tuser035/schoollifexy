-- Fix search_path for admin_insert_student function to be immutable
DROP FUNCTION IF EXISTS public.admin_insert_student(uuid, text, text, integer, integer, integer, text, text, text, text, text);

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
SET search_path = public, extensions
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

  -- Insert student row
  INSERT INTO public.students (
    student_id, name, grade, class, number, dept_code, 
    student_call, gmail, parents_call1, parents_call2
  ) VALUES (
    student_id_input, name_input, grade_input, class_input, number_input, 
    dept_code_input, student_call_input, gmail_input, parents_call1_input, parents_call2_input
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;