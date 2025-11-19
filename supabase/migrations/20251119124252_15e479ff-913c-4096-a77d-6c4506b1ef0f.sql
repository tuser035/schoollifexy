-- Create RPC function to get counseling records
CREATE OR REPLACE FUNCTION public.get_counseling_records(
  p_admin_id uuid,
  p_student_id text
)
RETURNS TABLE(
  id uuid,
  counselor_name text,
  counseling_date date,
  content text,
  created_at timestamp with time zone,
  attachment_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the caller is an admin or teacher
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = p_admin_id)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = p_admin_id) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Return counseling records
  RETURN QUERY
  SELECT 
    cc.id,
    cc.counselor_name,
    cc.counseling_date,
    cc.content,
    cc.created_at,
    cc.attachment_url
  FROM public.career_counseling cc
  WHERE cc.student_id = p_student_id
  ORDER BY cc.counseling_date DESC, cc.created_at DESC;
END;
$$;