-- admin_get_monthly 함수 수정: student_id 검색 지원 추가
CREATE OR REPLACE FUNCTION public.admin_get_monthly(admin_id_input uuid, search_text text DEFAULT NULL::text, search_grade integer DEFAULT NULL::integer, search_class integer DEFAULT NULL::integer)
 RETURNS TABLE(student_id text, year integer, month integer, student_name text, student_grade integer, student_class integer, teacher_name text, category text, reason text, created_at timestamp with time zone, image_url text)
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
    m.student_id, 
    m.year, 
    m.month, 
    s.name, 
    s.grade, 
    s.class, 
    t.name, 
    COALESCE(m.category, '-'), 
    COALESCE(m.reason, '-'),
    m.created_at,
    m.image_url
  FROM public.monthly m
  LEFT JOIN public.students s ON s.student_id = m.student_id
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE 
    (search_text IS NULL OR 
     s.name ILIKE '%' || search_text || '%' OR 
     t.name ILIKE '%' || search_text || '%' OR
     m.student_id ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY m.year DESC, m.month DESC
  LIMIT 50;
END;
$function$;