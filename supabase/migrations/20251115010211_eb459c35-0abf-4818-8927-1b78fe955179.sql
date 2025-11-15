-- Update admin functions to work with both admins and teachers

-- 1. Update admin_get_students to work for teachers too
CREATE OR REPLACE FUNCTION public.admin_get_students(admin_id_input uuid, search_text text DEFAULT NULL::text, search_grade integer DEFAULT NULL::integer, search_class integer DEFAULT NULL::integer)
RETURNS TABLE(student_id text, name text, grade integer, class integer, number integer, dept_name text, student_call text, gmail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- 2. Update admin_get_teachers
CREATE OR REPLACE FUNCTION public.admin_get_teachers(admin_id_input uuid, search_text text DEFAULT NULL::text, search_grade integer DEFAULT NULL::integer, search_class integer DEFAULT NULL::integer)
RETURNS TABLE(name text, call_t text, teacher_email text, grade integer, class integer, is_homeroom boolean, dept_name text)
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
    COALESCE(d.name, '-') as dept_name
  FROM public.teachers t
  LEFT JOIN public.departments d ON t.dept_code = d.code
  WHERE 
    (search_text IS NULL OR t.name ILIKE '%' || search_text || '%' OR t.call_t ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
  ORDER BY t.name
  LIMIT 50;
END;
$function$;

-- 3. Update admin_get_merits
CREATE OR REPLACE FUNCTION public.admin_get_merits(admin_id_input uuid, search_text text DEFAULT NULL::text, search_grade integer DEFAULT NULL::integer, search_class integer DEFAULT NULL::integer)
RETURNS TABLE(created_at timestamp with time zone, student_name text, student_grade integer, student_class integer, teacher_name text, category text, reason text, score integer, image_url text)
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

-- 4. Update admin_get_demerits
CREATE OR REPLACE FUNCTION public.admin_get_demerits(admin_id_input uuid, search_text text DEFAULT NULL::text, search_grade integer DEFAULT NULL::integer, search_class integer DEFAULT NULL::integer)
RETURNS TABLE(created_at timestamp with time zone, student_name text, student_grade integer, student_class integer, teacher_name text, category text, reason text, score integer, image_url text)
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

-- 5. Update admin_get_monthly
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
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%' OR t.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY m.year DESC, m.month DESC
  LIMIT 50;
END;
$function$;

-- 6. Update admin_get_homeroom
CREATE OR REPLACE FUNCTION public.admin_get_homeroom(admin_id_input uuid, search_grade integer DEFAULT NULL::integer, search_class integer DEFAULT NULL::integer)
RETURNS TABLE(year integer, grade integer, class integer, teacher_name text)
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
    EXTRACT(YEAR FROM now())::integer as year,
    t.grade,
    t.class,
    COALESCE(t.name, '-') as teacher_name
  FROM public.teachers t
  WHERE 
    t.is_homeroom = true
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
  ORDER BY t.grade, t.class
  LIMIT 50;
END;
$function$;

-- 7. Update admin_get_student_points_by_class
CREATE OR REPLACE FUNCTION public.admin_get_student_points_by_class(admin_id_input uuid, p_grade integer, p_class integer)
RETURNS TABLE(student_id text, name text, merits integer, demerits integer, monthly integer, total integer)
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
  WITH s AS (
    SELECT st.student_id, st.name 
    FROM public.students st 
    WHERE st.grade = p_grade AND st.class = p_class
  ),
  m AS (
    SELECT me.student_id, COALESCE(SUM(me.score),0)::integer AS merits 
    FROM public.merits me
    WHERE me.student_id IN (SELECT s.student_id FROM s)
    GROUP BY me.student_id
  ),
  d AS (
    SELECT de.student_id, COALESCE(SUM(de.score),0)::integer AS demerits 
    FROM public.demerits de
    WHERE de.student_id IN (SELECT s.student_id FROM s)
    GROUP BY de.student_id
  ),
  mo AS (
    SELECT mo_inner.student_id, COUNT(*)::integer AS monthly 
    FROM public.monthly mo_inner
    WHERE mo_inner.student_id IN (SELECT s.student_id FROM s)
    GROUP BY mo_inner.student_id
  )
  SELECT 
    s.student_id, 
    s.name,
    COALESCE(m.merits,0)::integer AS merits,
    COALESCE(d.demerits,0)::integer AS demerits,
    COALESCE(mo.monthly,0)::integer AS monthly,
    (COALESCE(m.merits,0) - COALESCE(d.demerits,0))::integer AS total
  FROM s
  LEFT JOIN m ON m.student_id = s.student_id
  LEFT JOIN d ON d.student_id = s.student_id
  LEFT JOIN mo ON mo.student_id = s.student_id
  ORDER BY s.name;
END;
$function$;

-- 8. Update admin_get_merit_details
CREATE OR REPLACE FUNCTION public.admin_get_merit_details(admin_id_input uuid, student_id_input text)
RETURNS TABLE(created_at timestamp with time zone, teacher_name text, category text, reason text, score integer, image_url text)
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
  SELECT m.created_at, COALESCE(t.name, '-'), m.category, COALESCE(m.reason, '-'), m.score, m.image_url
  FROM public.merits m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$function$;

-- 9. Update admin_get_demerit_details
CREATE OR REPLACE FUNCTION public.admin_get_demerit_details(admin_id_input uuid, student_id_input text)
RETURNS TABLE(created_at timestamp with time zone, teacher_name text, category text, reason text, score integer, image_url text)
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
  SELECT d.created_at, COALESCE(t.name, '-'), d.category, COALESCE(d.reason, '-'), d.score, d.image_url
  FROM public.demerits d
  LEFT JOIN public.teachers t ON t.id = d.teacher_id
  WHERE d.student_id = student_id_input
  ORDER BY d.created_at DESC;
END;
$function$;

-- 10. Update admin_get_monthly_details
CREATE OR REPLACE FUNCTION public.admin_get_monthly_details(admin_id_input uuid, student_id_input text)
RETURNS TABLE(created_at timestamp with time zone, teacher_name text, category text, reason text, image_url text)
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
  SELECT m.created_at, COALESCE(t.name, '-'), COALESCE(m.category, '-'), COALESCE(m.reason, '-'), m.image_url
  FROM public.monthly m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$function$;

-- 11. Update admin_get_counseling_records
CREATE OR REPLACE FUNCTION public.admin_get_counseling_records(admin_id_input uuid, student_id_input text)
RETURNS TABLE(id uuid, counselor_name text, counseling_date date, content text, created_at timestamp with time zone)
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
    cc.id,
    cc.counselor_name,
    cc.counseling_date,
    cc.content,
    cc.created_at
  FROM public.career_counseling cc
  WHERE cc.student_id = student_id_input
  ORDER BY cc.counseling_date DESC, cc.created_at DESC;
END;
$function$;

-- 12. Update admin_get_leaderboard
CREATE OR REPLACE FUNCTION public.admin_get_leaderboard(admin_id_input uuid, search_grade integer DEFAULT NULL::integer, search_class integer DEFAULT NULL::integer, year_input integer DEFAULT NULL::integer)
RETURNS TABLE(student_id text, name text, grade integer, class integer, number integer, merits integer, demerits integer, monthly integer, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  WITH s AS (
    SELECT st.student_id, st.name, st.grade, st.class, st.number
    FROM public.students st
    WHERE (search_grade IS NULL OR st.grade = search_grade)
      AND (search_class IS NULL OR st.class = search_class)
  ),
  m AS (
    SELECT trim(me.student_id) AS student_id, COALESCE(SUM(me.score), 0)::integer AS merits
    FROM public.merits me
    WHERE (year_input IS NULL OR EXTRACT(YEAR FROM me.created_at) = year_input)
    GROUP BY trim(me.student_id)
  ),
  d AS (
    SELECT trim(de.student_id) AS student_id, COALESCE(SUM(de.score), 0)::integer AS demerits
    FROM public.demerits de
    WHERE (year_input IS NULL OR EXTRACT(YEAR FROM de.created_at) = year_input)
    GROUP BY trim(de.student_id)
  ),
  mo AS (
    SELECT trim(mo_inner.student_id) AS student_id, COUNT(*)::integer AS monthly
    FROM public.monthly mo_inner
    WHERE (year_input IS NULL OR mo_inner.year = year_input)
    GROUP BY trim(mo_inner.student_id)
  )
  SELECT 
    s.student_id,
    s.name,
    s.grade,
    s.class,
    s.number,
    COALESCE(m.merits, 0)::integer AS merits,
    COALESCE(d.demerits, 0)::integer AS demerits,
    COALESCE(mo.monthly, 0)::integer AS monthly,
    (COALESCE(m.merits, 0) - COALESCE(d.demerits, 0))::integer AS total
  FROM s
  LEFT JOIN m ON m.student_id = s.student_id
  LEFT JOIN d ON d.student_id = s.student_id
  LEFT JOIN mo ON mo.student_id = s.student_id
  ORDER BY total DESC, merits DESC, name ASC;
END;
$function$;

-- Update RLS policies to allow teachers to view edufine documents and career counseling
CREATE POLICY "Teachers can view edufine documents"
ON public.edufine_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.teachers 
  WHERE (teachers.id)::text = current_setting('app.current_teacher_id'::text, true)
));

CREATE POLICY "Teachers can view all counseling records"
ON public.career_counseling
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.teachers
  WHERE (teachers.id)::text = current_setting('app.current_teacher_id'::text, true)
));