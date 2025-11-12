-- Fix ambiguous column reference in admin_get_counseling_records function
DROP FUNCTION IF EXISTS public.admin_get_counseling_records(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_get_counseling_records(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  id uuid,
  counselor_name text,
  counseling_date date,
  content text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 관리자 인증 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    cc.id,
    cc.counselor_name,
    cc.counseling_date,
    cc.content,
    cc.created_at
  FROM public.career_counseling cc
  WHERE cc.student_id = student_id_input
  ORDER BY cc.counseling_date DESC, cc.created_at DESC;
END;
$function$;