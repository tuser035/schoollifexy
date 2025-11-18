-- 관리자가 학생 정보를 수정하는 함수
CREATE OR REPLACE FUNCTION public.admin_update_student(
  admin_id_input uuid,
  student_id_input text,
  name_input text,
  student_call_input text,
  gmail_input text,
  parents_call1_input text,
  parents_call2_input text
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

  -- 학생 정보 업데이트
  UPDATE public.students
  SET 
    name = name_input,
    student_call = NULLIF(student_call_input, ''),
    gmail = NULLIF(gmail_input, ''),
    parents_call1 = NULLIF(parents_call1_input, ''),
    parents_call2 = NULLIF(parents_call2_input, '')
  WHERE student_id = student_id_input;

  RETURN FOUND;
END;
$function$;

-- 관리자가 교사 정보를 수정하는 함수
CREATE OR REPLACE FUNCTION public.admin_update_teacher(
  admin_id_input uuid,
  original_email_input text,
  name_input text,
  call_t_input text,
  teacher_email_input text,
  grade_input integer,
  class_input integer,
  department_input text,
  subject_input text,
  is_homeroom_input boolean
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

  -- 교사 정보 업데이트
  UPDATE public.teachers
  SET 
    name = name_input,
    call_t = call_t_input,
    teacher_email = teacher_email_input,
    grade = grade_input,
    class = class_input,
    department = NULLIF(department_input, ''),
    subject = NULLIF(subject_input, ''),
    is_homeroom = is_homeroom_input
  WHERE teacher_email = original_email_input;

  RETURN FOUND;
END;
$function$;