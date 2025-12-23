-- Update admin_update_student function to include nationality_code
CREATE OR REPLACE FUNCTION public.admin_update_student(
  admin_id_input text,
  student_id_input text,
  name_input text,
  student_call_input text,
  gmail_input text,
  parents_call1_input text,
  parents_call2_input text,
  nationality_code_input text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid_admin boolean := false;
BEGIN
  -- Verify admin exists
  SELECT EXISTS(SELECT 1 FROM admins WHERE id::text = admin_id_input) INTO is_valid_admin;
  
  IF NOT is_valid_admin THEN
    RAISE EXCEPTION 'Invalid admin';
  END IF;

  -- Update student
  UPDATE students
  SET 
    name = name_input,
    student_call = NULLIF(student_call_input, ''),
    gmail = NULLIF(gmail_input, ''),
    parents_call1 = NULLIF(parents_call1_input, ''),
    parents_call2 = NULLIF(parents_call2_input, ''),
    nationality_code = nationality_code_input,
    updated_at = now()
  WHERE student_id = student_id_input;

  RETURN true;
END;
$$;