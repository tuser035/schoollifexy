-- 관리자/교사가 학생 그룹을 저장하는 함수
CREATE OR REPLACE FUNCTION public.admin_insert_student_group(
  admin_id_input uuid,
  group_name_input text,
  student_ids_input text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_group_id uuid;
BEGIN
  -- 관리자 또는 교사 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 세션 설정
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- 학생 그룹 삽입
  INSERT INTO public.student_groups (admin_id, group_name, student_ids)
  VALUES (admin_id_input, group_name_input, student_ids_input)
  RETURNING id INTO new_group_id;

  RETURN new_group_id;
END;
$function$;