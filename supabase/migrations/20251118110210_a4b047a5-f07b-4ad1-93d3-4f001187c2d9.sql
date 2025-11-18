-- 관리자가 학생을 삭제하는 함수
CREATE OR REPLACE FUNCTION public.admin_delete_student(
  admin_id_input uuid,
  student_id_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  -- 세션 설정
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- 학생 삭제
  DELETE FROM public.students WHERE student_id = student_id_input;

  RETURN FOUND;
END;
$function$;

-- 관리자가 교사를 삭제하는 함수
CREATE OR REPLACE FUNCTION public.admin_delete_teacher(
  admin_id_input uuid,
  teacher_email_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  -- 세션 설정
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- 교사 삭제
  DELETE FROM public.teachers WHERE teacher_email = teacher_email_input;

  RETURN FOUND;
END;
$function$;