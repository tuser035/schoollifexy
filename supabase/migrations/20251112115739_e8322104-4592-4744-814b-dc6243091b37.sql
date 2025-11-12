-- 관리자용 homeroom 조회 함수 (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_get_homeroom(
  admin_id_input uuid,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE (
  year integer,
  grade integer,
  class integer,
  teacher_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 인증 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  -- homeroom 데이터 조회
  RETURN QUERY
  SELECT 
    h.year,
    h.grade,
    h.class,
    COALESCE(t.name, '-') as teacher_name
  FROM public.homeroom h
  LEFT JOIN public.teachers t ON h.teacher_id = t.id
  WHERE 
    (search_grade IS NULL OR h.grade = search_grade)
    AND (search_class IS NULL OR h.class = search_class)
  ORDER BY h.grade, h.class
  LIMIT 50;
END;
$$;

-- 관리자용 학생 조회 함수
CREATE OR REPLACE FUNCTION public.admin_get_students(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE (
  student_id text,
  name text,
  grade integer,
  class integer,
  number integer,
  dept_name text,
  student_call text,
  gmail text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    s.student_id,
    s.name,
    s.grade,
    s.class,
    s.number,
    COALESCE(d.name, '-') as dept_name,
    COALESCE(s.student_call, '-') as student_call,
    COALESCE(s.gmail, '-') as gmail
  FROM public.students s
  LEFT JOIN public.departments d ON s.dept_code = d.code
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY s.grade, s.class, s.number
  LIMIT 50;
END;
$$;

-- 관리자용 교사 조회 함수
CREATE OR REPLACE FUNCTION public.admin_get_teachers(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE (
  name text,
  call_t text,
  teacher_email text,
  grade integer,
  class integer,
  is_homeroom boolean,
  dept_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    t.name,
    t.call_t,
    t.teacher_email,
    t.grade,
    t.class,
    t.is_homeroom,
    COALESCE(d.name, '-') as dept_name
  FROM public.teachers t
  LEFT JOIN public.departments d ON t.dept_code = d.code
  WHERE 
    (search_text IS NULL OR t.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
  ORDER BY t.name
  LIMIT 50;
END;
$$;