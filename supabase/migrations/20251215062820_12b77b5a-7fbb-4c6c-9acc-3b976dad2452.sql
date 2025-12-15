-- 교사가 자신의 교사 그룹을 조회하는 RPC 함수 생성
CREATE OR REPLACE FUNCTION public.teacher_get_own_teacher_groups(teacher_id_input uuid)
RETURNS TABLE(
  id uuid,
  group_name text,
  teacher_ids text[],
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 교사 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = teacher_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 세션 설정
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, true);

  -- 교사 그룹 조회
  RETURN QUERY
  SELECT 
    tg.id,
    tg.group_name,
    tg.teacher_ids,
    tg.created_at,
    tg.updated_at
  FROM public.teacher_groups tg
  WHERE tg.admin_id = teacher_id_input
  ORDER BY tg.created_at DESC;
END;
$$;