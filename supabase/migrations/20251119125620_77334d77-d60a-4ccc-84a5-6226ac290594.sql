-- Create RPC function to update counseling record
CREATE OR REPLACE FUNCTION public.update_counseling_record(
  p_admin_id uuid,
  p_record_id uuid,
  p_counselor_name text,
  p_counseling_date date,
  p_content text,
  p_attachment_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the caller is an admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Update the counseling record
  UPDATE public.career_counseling
  SET 
    counselor_name = p_counselor_name,
    counseling_date = p_counseling_date,
    content = p_content,
    attachment_url = p_attachment_url,
    updated_at = now()
  WHERE id = p_record_id;

  RETURN FOUND;
END;
$$;

-- Create RPC function to delete counseling record
CREATE OR REPLACE FUNCTION public.delete_counseling_record(
  p_admin_id uuid,
  p_record_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the caller is an admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = p_admin_id) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Delete the counseling record
  DELETE FROM public.career_counseling
  WHERE id = p_record_id;

  RETURN FOUND;
END;
$$;