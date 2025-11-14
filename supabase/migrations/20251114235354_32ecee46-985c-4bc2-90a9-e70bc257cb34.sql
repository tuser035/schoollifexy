-- Drop and recreate admin_get_merits function to include image_url
DROP FUNCTION IF EXISTS public.admin_get_merits(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_merits(
  admin_id_input uuid, 
  search_text text DEFAULT NULL::text, 
  search_grade integer DEFAULT NULL::integer, 
  search_class integer DEFAULT NULL::integer
)
RETURNS TABLE(
  created_at timestamp with time zone, 
  student_name text, 
  student_grade integer, 
  student_class integer, 
  teacher_name text, 
  category text, 
  reason text, 
  score integer,
  image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    m.created_at, 
    s.name, 
    s.grade, 
    s.class, 
    t.name, 
    m.category, 
    m.reason, 
    m.score,
    m.image_url
  FROM public.merits m
  LEFT JOIN public.students s ON s.student_id = m.student_id
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%' OR t.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY m.created_at DESC
  LIMIT 50;
END;
$function$;

-- Drop and recreate admin_get_demerits function to include image_url
DROP FUNCTION IF EXISTS public.admin_get_demerits(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_demerits(
  admin_id_input uuid, 
  search_text text DEFAULT NULL::text, 
  search_grade integer DEFAULT NULL::integer, 
  search_class integer DEFAULT NULL::integer
)
RETURNS TABLE(
  created_at timestamp with time zone, 
  student_name text, 
  student_grade integer, 
  student_class integer, 
  teacher_name text, 
  category text, 
  reason text, 
  score integer,
  image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    d.created_at, 
    s.name, 
    s.grade, 
    s.class, 
    t.name, 
    d.category, 
    d.reason, 
    d.score,
    d.image_url
  FROM public.demerits d
  LEFT JOIN public.students s ON s.student_id = d.student_id
  LEFT JOIN public.teachers t ON t.id = d.teacher_id
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%' OR t.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY d.created_at DESC
  LIMIT 50;
END;
$function$;