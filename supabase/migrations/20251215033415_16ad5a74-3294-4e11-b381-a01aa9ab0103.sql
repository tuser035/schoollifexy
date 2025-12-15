-- 학생 그룹의 학생 이메일을 조회하는 RPC 함수 생성
CREATE OR REPLACE FUNCTION public.teacher_get_students_by_ids(
  teacher_id_input uuid,
  student_ids_input text[]
)
RETURNS TABLE(
  student_id text,
  name text,
  gmail text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 교사 또는 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = teacher_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = teacher_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 세션 설정
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, true);

  -- 학생 정보 조회
  RETURN QUERY
  SELECT 
    s.student_id,
    s.name,
    s.gmail
  FROM public.students s
  WHERE s.student_id = ANY(student_ids_input)
  ORDER BY s.grade, s.class, s.number;
END;
$$;