
-- 1. admin_get_teachers 함수에 is_counselor 필드 추가
DROP FUNCTION IF EXISTS public.admin_get_teachers(uuid, text, integer, integer, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_get_teachers(
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
  id uuid, 
  name text, 
  call_t text, 
  teacher_email text, 
  grade integer, 
  class integer, 
  is_homeroom boolean, 
  is_admin boolean, 
  is_counselor boolean,
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
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.call_t,
    t.teacher_email,
    t.grade,
    t.class,
    t.is_homeroom,
    t.is_admin,
    COALESCE(t.is_counselor, false) as is_counselor,
    COALESCE(d.name, '-') as dept_name,
    COALESCE(t.department, '-') as department,
    COALESCE(t.subject, '-') as subject,
    t.photo_url
  FROM public.teachers t
  LEFT JOIN public.departments d ON t.dept_code = d.code
  WHERE 
    (search_text IS NULL OR t.name ILIKE '%' || search_text || '%' OR t.call_t ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
  ORDER BY t.name
  LIMIT 50;
END;
$$;

-- 2. admin_update_teacher 함수에 is_counselor 파라미터 추가
DROP FUNCTION IF EXISTS public.admin_update_teacher(uuid, text, text, text, text, integer, integer, text, text, boolean);
DROP FUNCTION IF EXISTS public.admin_update_teacher(uuid, text, text, text, text, integer, integer, text, text, boolean, boolean);

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
  is_admin_input boolean DEFAULT false,
  is_counselor_input boolean DEFAULT false
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
    is_admin = is_admin_input,
    is_counselor = is_counselor_input
  WHERE teacher_email = original_email_input;

  RETURN FOUND;
END;
$$;

-- 3. admin_insert_teacher 함수에 is_counselor 파라미터 추가
DROP FUNCTION IF EXISTS public.admin_insert_teacher(uuid, text, text, text, integer, integer, boolean, text, text, text);
DROP FUNCTION IF EXISTS public.admin_insert_teacher(uuid, text, text, text, integer, integer, boolean, boolean, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_insert_teacher(
  admin_id_input uuid, 
  name_input text, 
  call_t_input text, 
  teacher_email_input text, 
  grade_input integer DEFAULT NULL, 
  class_input integer DEFAULT NULL, 
  is_homeroom_input boolean DEFAULT false, 
  is_admin_input boolean DEFAULT false,
  is_counselor_input boolean DEFAULT false,
  dept_code_input text DEFAULT NULL, 
  department_input text DEFAULT NULL, 
  subject_input text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_id uuid;
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session context for RLS
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert or update teacher row (UPSERT)
  INSERT INTO public.teachers (
    name, call_t, teacher_email, grade, class, is_homeroom, is_admin, is_counselor, dept_code, department, subject
  ) VALUES (
    name_input, call_t_input, teacher_email_input, grade_input, class_input, is_homeroom_input, is_admin_input, is_counselor_input, dept_code_input, department_input, subject_input
  )
  ON CONFLICT (teacher_email) DO UPDATE
  SET
    name = EXCLUDED.name,
    call_t = EXCLUDED.call_t,
    grade = EXCLUDED.grade,
    class = EXCLUDED.class,
    is_homeroom = EXCLUDED.is_homeroom,
    is_admin = EXCLUDED.is_admin,
    is_counselor = EXCLUDED.is_counselor,
    dept_code = EXCLUDED.dept_code,
    department = EXCLUDED.department,
    subject = EXCLUDED.subject,
    updated_at = now()
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;
