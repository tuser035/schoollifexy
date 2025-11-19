-- teachers 테이블에 is_admin 컬럼 추가
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- is_admin이 true인 교사를 admins 테이블에 동기화하는 함수
CREATE OR REPLACE FUNCTION public.sync_teacher_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_admin = true THEN
    -- admins 테이블에 교사 정보 추가 (이미 존재하면 업데이트)
    INSERT INTO public.admins (id, email, name, password_hash)
    VALUES (NEW.id, NEW.teacher_email, NEW.name, NEW.password_hash)
    ON CONFLICT (id) 
    DO UPDATE SET 
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash;
  ELSIF OLD.is_admin = true AND NEW.is_admin = false THEN
    -- is_admin이 false로 변경되면 admins 테이블에서 삭제
    DELETE FROM public.admins WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 트리거 생성
DROP TRIGGER IF EXISTS sync_teacher_admin ON public.teachers;
CREATE TRIGGER sync_teacher_admin
AFTER INSERT OR UPDATE OF is_admin ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.sync_teacher_to_admin();

-- admin_update_teacher 함수를 is_admin 파라미터 포함하도록 업데이트
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
  is_homeroom_input boolean,
  is_admin_input boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    is_homeroom = is_homeroom_input,
    is_admin = is_admin_input
  WHERE teacher_email = original_email_input;

  RETURN FOUND;
END;
$$;

-- 기존 admin_get_teachers 함수 삭제
DROP FUNCTION IF EXISTS public.admin_get_teachers(uuid, text, integer, integer, text, text, text, text);

-- admin_get_teachers 함수를 is_admin 컬럼 포함하도록 재생성
CREATE FUNCTION public.admin_get_teachers(
  admin_id_input uuid, 
  search_text text DEFAULT NULL, 
  search_grade integer DEFAULT NULL, 
  search_class integer DEFAULT NULL, 
  search_department text DEFAULT NULL, 
  search_subject text DEFAULT NULL, 
  search_dept_name text DEFAULT NULL, 
  search_homeroom text DEFAULT NULL
)
RETURNS TABLE(
  name text, 
  call_t text, 
  teacher_email text, 
  grade integer, 
  class integer, 
  is_homeroom boolean, 
  is_admin boolean,
  dept_name text, 
  department text, 
  subject text, 
  photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    t.name,
    t.call_t,
    t.teacher_email,
    t.grade,
    t.class,
    t.is_homeroom,
    t.is_admin,
    COALESCE(d.name, '-') as dept_name,
    COALESCE(t.department, '-') as department,
    COALESCE(t.subject, '-') as subject,
    t.photo_url
  FROM public.teachers t
  LEFT JOIN public.departments d ON t.dept_code = d.code
  WHERE 
    (search_text IS NULL OR 
     t.name ILIKE '%' || search_text || '%' OR 
     t.call_t ILIKE '%' || search_text || '%' OR
     t.teacher_email ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
    AND (search_department IS NULL OR t.department ILIKE '%' || search_department || '%')
    AND (search_subject IS NULL OR t.subject ILIKE '%' || search_subject || '%')
    AND (search_dept_name IS NULL OR d.name ILIKE '%' || search_dept_name || '%')
    AND (search_homeroom IS NULL OR 
         (search_homeroom = 'true' AND t.is_homeroom = true) OR
         (search_homeroom = 'false' AND t.is_homeroom = false))
  ORDER BY t.name;
END;
$$;