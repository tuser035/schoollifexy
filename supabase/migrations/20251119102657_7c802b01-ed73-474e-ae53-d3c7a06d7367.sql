-- Drop existing functions that need return type changes
DROP FUNCTION IF EXISTS public.admin_get_merits(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_get_demerits(uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_get_merit_details(uuid, text);
DROP FUNCTION IF EXISTS public.admin_get_demerit_details(uuid, text);
DROP FUNCTION IF EXISTS public.admin_get_monthly_details(uuid, text);
DROP FUNCTION IF EXISTS public.admin_get_monthly(uuid, text, integer, integer);

-- Recreate admin_get_merits function with image_url array
CREATE OR REPLACE FUNCTION public.admin_get_merits(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
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
  image_url text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
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
$$;

-- Recreate admin_get_demerits function with image_url array
CREATE OR REPLACE FUNCTION public.admin_get_demerits(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
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
  image_url text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
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
$$;

-- Recreate admin_get_merit_details function with image_url array
CREATE OR REPLACE FUNCTION public.admin_get_merit_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  created_at timestamp with time zone,
  teacher_name text,
  category text,
  reason text,
  score integer,
  image_url text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
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
$$;

-- Recreate admin_get_demerit_details function with image_url array
CREATE OR REPLACE FUNCTION public.admin_get_demerit_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  created_at timestamp with time zone,
  teacher_name text,
  category text,
  reason text,
  score integer,
  image_url text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
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
$$;

-- Recreate admin_get_monthly_details function with image_url array
CREATE OR REPLACE FUNCTION public.admin_get_monthly_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  created_at timestamp with time zone,
  teacher_name text,
  category text,
  reason text,
  image_url text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    m.created_at,
    COALESCE(t.name, '-'),
    COALESCE(m.category, '-'),
    COALESCE(m.reason, '-'),
    m.image_url
  FROM public.monthly m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$$;

-- Recreate admin_get_monthly function with image_url array
CREATE OR REPLACE FUNCTION public.admin_get_monthly(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  student_id text,
  year integer,
  month integer,
  student_name text,
  student_grade integer,
  student_class integer,
  teacher_name text,
  category text,
  reason text,
  created_at timestamp with time zone,
  image_url text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;