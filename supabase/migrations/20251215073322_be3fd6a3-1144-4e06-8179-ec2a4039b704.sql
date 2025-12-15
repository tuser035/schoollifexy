-- admin_get_teachers 함수에 id 필드 추가
DROP FUNCTION IF EXISTS public.admin_get_teachers(uuid, text, integer, integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_get_teachers(uuid, text, integer, integer);

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
  dept_name text,
  department text,
  subject text,
  photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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