-- Update admin_get_students function to include class-based department names
CREATE OR REPLACE FUNCTION public.admin_get_students(
  admin_id_input uuid, 
  search_text text DEFAULT NULL::text, 
  search_grade integer DEFAULT NULL::integer, 
  search_class integer DEFAULT NULL::integer
)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow both admins and teachers
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    s.student_id,
    s.name,
    s.grade,
    s.class,
    s.number,
    CASE 
      WHEN s.class IN (1, 2) THEN '관광서비스'
      WHEN s.class IN (3, 4) THEN '글로벌경영'
      WHEN s.class IN (5, 6) THEN '스포츠창업'
      WHEN s.class IN (7, 8) THEN 'IT융합정보'
      WHEN s.class = 9 THEN '유튜브창업'
      ELSE COALESCE(d.name, '-')
    END as dept_name,
    COALESCE(s.student_call, '-') as student_call,
    COALESCE(s.gmail, '-') as gmail
  FROM public.students s
  LEFT JOIN public.departments d ON s.dept_code = d.code
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%' OR s.student_id ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY s.grade, s.class, s.number;
END;
$$;