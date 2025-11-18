-- 관리자/교사가 학생 그룹 목록을 조회하는 함수
CREATE OR REPLACE FUNCTION public.admin_get_student_groups(
  admin_id_input uuid
)
RETURNS TABLE(
  id uuid,
  group_name text,
  student_ids text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 관리자 또는 교사 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 세션 설정
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- 학생 그룹 조회
  RETURN QUERY
  SELECT 
    sg.id,
    sg.group_name,
    sg.student_ids,
    sg.created_at,
    sg.updated_at
  FROM public.student_groups sg
  WHERE sg.admin_id = admin_id_input
  ORDER BY sg.created_at DESC;
END;
$function$;