-- Create function to get all counseling records with student information
CREATE OR REPLACE FUNCTION admin_get_all_counseling_records(
  admin_id_input uuid
)
RETURNS TABLE(
  id uuid,
  student_id text,
  student_name text,
  counselor_name text,
  counseling_date date,
  content text,
  attachment_url text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify that the caller is an admin or teacher
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Return all counseling records with student information
  RETURN QUERY
  SELECT 
    cc.id,
    cc.student_id,
    s.name as student_name,
    cc.counselor_name,
    cc.counseling_date,
    cc.content,
    cc.attachment_url,
    cc.created_at
  FROM public.career_counseling cc
  LEFT JOIN public.students s ON s.student_id = cc.student_id
  ORDER BY cc.counseling_date DESC, cc.created_at DESC;
END;
$$;