-- Update admin_get_teachers function to support homeroom and dept_name filtering
CREATE OR REPLACE FUNCTION public.admin_get_teachers(
  admin_id_input uuid, 
  search_text text DEFAULT NULL::text, 
  search_grade integer DEFAULT NULL::integer, 
  search_class integer DEFAULT NULL::integer, 
  search_department text DEFAULT NULL::text, 
  search_subject text DEFAULT NULL::text,
  search_homeroom text DEFAULT NULL::text,
  search_dept_name text DEFAULT NULL::text
)
RETURNS TABLE(
  name text, 
  call_t text, 
  teacher_email text, 
  grade integer, 
  class integer, 
  is_homeroom boolean, 
  dept_name text, 
  department text, 
  subject text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    COALESCE(d.name, '-') as dept_name,
    COALESCE(t.department, '-') as department,
    COALESCE(t.subject, '-') as subject
  FROM public.teachers t
  LEFT JOIN public.departments d ON t.dept_code = d.code
  WHERE 
    (search_text IS NULL OR t.name ILIKE '%' || search_text || '%' OR t.call_t ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
    AND (search_department IS NULL OR t.department ILIKE '%' || search_department || '%')
    AND (search_subject IS NULL OR t.subject ILIKE '%' || search_subject || '%')
    AND (search_homeroom IS NULL OR 
         (search_homeroom = '담임' AND t.is_homeroom = true) OR
         (search_homeroom = '-' AND (t.is_homeroom = false OR t.is_homeroom IS NULL)))
    AND (search_dept_name IS NULL OR d.name = search_dept_name)
  ORDER BY t.name
  LIMIT 50;
END;
$function$;