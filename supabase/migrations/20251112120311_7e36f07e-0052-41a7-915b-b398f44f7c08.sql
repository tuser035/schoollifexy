-- Admin-safe merits list
CREATE OR REPLACE FUNCTION public.admin_get_merits(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE (
  created_at timestamptz,
  student_name text,
  student_grade integer,
  student_class integer,
  teacher_name text,
  category text,
  reason text,
  score integer
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
  SELECT m.created_at, s.name, s.grade, s.class, t.name, m.category, m.reason, m.score
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

-- Admin-safe demerits list
CREATE OR REPLACE FUNCTION public.admin_get_demerits(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE (
  created_at timestamptz,
  student_name text,
  student_grade integer,
  student_class integer,
  teacher_name text,
  category text,
  reason text,
  score integer
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
  SELECT d.created_at, s.name, s.grade, s.class, t.name, d.category, d.reason, d.score
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

-- Admin-safe monthly list
CREATE OR REPLACE FUNCTION public.admin_get_monthly(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE (
  year integer,
  month integer,
  student_name text,
  student_grade integer,
  student_class integer,
  teacher_name text,
  category text,
  reason text
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
  SELECT m.year, m.month, s.name, s.grade, s.class, t.name, COALESCE(m.category, '-'), COALESCE(m.reason, '-')
  FROM public.monthly m
  LEFT JOIN public.students s ON s.student_id = m.student_id
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY m.year DESC, m.month DESC
  LIMIT 50;
END;
$$;

-- Class points aggregation
CREATE OR REPLACE FUNCTION public.admin_get_student_points_by_class(
  admin_id_input uuid,
  p_grade integer,
  p_class integer
)
RETURNS TABLE (
  student_id text,
  name text,
  merits integer,
  demerits integer,
  monthly integer,
  total integer
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
  WITH s AS (
    SELECT student_id, name FROM public.students WHERE grade = p_grade AND class = p_class
  ),
  m AS (
    SELECT student_id, COALESCE(SUM(score),0) AS merits FROM public.merits WHERE student_id IN (SELECT student_id FROM s) GROUP BY student_id
  ),
  d AS (
    SELECT student_id, COALESCE(SUM(score),0) AS demerits FROM public.demerits WHERE student_id IN (SELECT student_id FROM s) GROUP BY student_id
  ),
  mo AS (
    SELECT student_id, COUNT(*) AS monthly FROM public.monthly WHERE student_id IN (SELECT student_id FROM s) GROUP BY student_id
  )
  SELECT s.student_id, s.name,
         COALESCE(m.merits,0) AS merits,
         COALESCE(d.demerits,0) AS demerits,
         COALESCE(mo.monthly,0) AS monthly,
         COALESCE(m.merits,0) - COALESCE(d.demerits,0) AS total
  FROM s
  LEFT JOIN m ON m.student_id = s.student_id
  LEFT JOIN d ON d.student_id = s.student_id
  LEFT JOIN mo ON mo.student_id = s.student_id
  ORDER BY s.name;
END;
$$;

-- Details: merits
CREATE OR REPLACE FUNCTION public.admin_get_merit_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE (
  created_at timestamptz,
  teacher_name text,
  category text,
  reason text,
  score integer,
  image_url text
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
  SELECT m.created_at, COALESCE(t.name, '-'), m.category, COALESCE(m.reason, '-'), m.score, m.image_url
  FROM public.merits m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$$;

-- Details: demerits
CREATE OR REPLACE FUNCTION public.admin_get_demerit_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE (
  created_at timestamptz,
  teacher_name text,
  category text,
  reason text,
  score integer,
  image_url text
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
  SELECT d.created_at, COALESCE(t.name, '-'), d.category, COALESCE(d.reason, '-'), d.score, d.image_url
  FROM public.demerits d
  LEFT JOIN public.teachers t ON t.id = d.teacher_id
  WHERE d.student_id = student_id_input
  ORDER BY d.created_at DESC;
END;
$$;

-- Details: monthly
CREATE OR REPLACE FUNCTION public.admin_get_monthly_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE (
  created_at timestamptz,
  teacher_name text,
  category text,
  reason text,
  image_url text
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
  SELECT m.created_at, COALESCE(t.name, '-'), COALESCE(m.category, '-'), COALESCE(m.reason, '-'), m.image_url
  FROM public.monthly m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$$;