-- Drop existing functions first
DROP FUNCTION IF EXISTS public.admin_get_merit_details(uuid, text);
DROP FUNCTION IF EXISTS public.admin_get_demerit_details(uuid, text);
DROP FUNCTION IF EXISTS public.admin_get_monthly_details(uuid, text);

-- Recreate admin_get_merit_details with id
CREATE FUNCTION public.admin_get_merit_details(admin_id_input uuid, student_id_input text)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, teacher_name text, category text, reason text, score integer, image_url text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.created_at,
    COALESCE(t.name, '-'),
    m.category,
    COALESCE(m.reason, '-'),
    m.score,
    m.image_url
  FROM public.merits m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$function$;

-- Recreate admin_get_demerit_details with id
CREATE FUNCTION public.admin_get_demerit_details(admin_id_input uuid, student_id_input text)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, teacher_name text, category text, reason text, score integer, image_url text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.created_at,
    COALESCE(t.name, '-'),
    d.category,
    COALESCE(d.reason, '-'),
    d.score,
    d.image_url
  FROM public.demerits d
  LEFT JOIN public.teachers t ON t.id = d.teacher_id
  WHERE d.student_id = student_id_input
  ORDER BY d.created_at DESC;
END;
$function$;

-- Recreate admin_get_monthly_details with id
CREATE FUNCTION public.admin_get_monthly_details(admin_id_input uuid, student_id_input text)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, teacher_name text, category text, reason text, image_url text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.created_at,
    COALESCE(t.name, '-'),
    m.category,
    COALESCE(m.reason, '-'),
    m.image_url
  FROM public.monthly m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$function$;