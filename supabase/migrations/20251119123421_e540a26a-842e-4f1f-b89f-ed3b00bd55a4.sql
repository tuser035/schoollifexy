-- Create RPC function to insert counseling records
CREATE OR REPLACE FUNCTION public.insert_counseling_record(
  p_student_id text,
  p_counselor_name text,
  p_counseling_date date,
  p_content text,
  p_admin_id uuid,
  p_attachment_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_record_id uuid;
BEGIN
  -- Verify that the caller is an admin or teacher
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = p_admin_id) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Insert the counseling record
  INSERT INTO public.career_counseling (
    student_id,
    counselor_name,
    counseling_date,
    content,
    admin_id,
    attachment_url
  ) VALUES (
    p_student_id,
    p_counselor_name,
    p_counseling_date,
    p_content,
    p_admin_id,
    p_attachment_url
  )
  RETURNING id INTO new_record_id;

  RETURN new_record_id;
END;
$$;