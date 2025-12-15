-- 교사 그룹 이름 수정을 위한 RPC 함수 생성
CREATE OR REPLACE FUNCTION public.teacher_update_own_teacher_group_name(
  teacher_id_input uuid,
  group_id_input uuid,
  group_name_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 교사 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = teacher_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 세션 설정
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, true);

  -- 교사 그룹 이름 수정 (본인이 만든 그룹만)
  UPDATE public.teacher_groups
  SET group_name = group_name_input, updated_at = now()
  WHERE id = group_id_input AND admin_id = teacher_id_input;

  RETURN FOUND;
END;
$$;