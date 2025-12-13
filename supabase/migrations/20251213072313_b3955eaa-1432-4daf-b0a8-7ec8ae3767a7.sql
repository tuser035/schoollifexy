-- Create function for teacher to get their own merits with student info
CREATE OR REPLACE FUNCTION public.teacher_get_own_merits(teacher_id_input uuid)
RETURNS TABLE(
  id uuid,
  student_id text,
  student_name text,
  student_grade integer,
  student_class integer,
  student_number integer,
  category text,
  reason text,
  score integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = teacher_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.student_id,
    COALESCE(s.name, '-') as student_name,
    COALESCE(s.grade, 0) as student_grade,
    COALESCE(s.class, 0) as student_class,
    COALESCE(s.number, 0) as student_number,
    m.category,
    COALESCE(m.reason, '') as reason,
    m.score,
    m.created_at
  FROM public.merits m
  LEFT JOIN public.students s ON s.student_id = m.student_id
  WHERE m.teacher_id = teacher_id_input
  ORDER BY m.created_at DESC
  LIMIT 50;
END;
$function$;

-- Create function for teacher to get their own demerits with student info
CREATE OR REPLACE FUNCTION public.teacher_get_own_demerits(teacher_id_input uuid)
RETURNS TABLE(
  id uuid,
  student_id text,
  student_name text,
  student_grade integer,
  student_class integer,
  student_number integer,
  category text,
  reason text,
  score integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = teacher_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.student_id,
    COALESCE(s.name, '-') as student_name,
    COALESCE(s.grade, 0) as student_grade,
    COALESCE(s.class, 0) as student_class,
    COALESCE(s.number, 0) as student_number,
    d.category,
    COALESCE(d.reason, '') as reason,
    d.score,
    d.created_at
  FROM public.demerits d
  LEFT JOIN public.students s ON s.student_id = d.student_id
  WHERE d.teacher_id = teacher_id_input
  ORDER BY d.created_at DESC
  LIMIT 50;
END;
$function$;

-- Create function for teacher to get their own monthly recommendations with student info
CREATE OR REPLACE FUNCTION public.teacher_get_own_monthly(teacher_id_input uuid)
RETURNS TABLE(
  id uuid,
  student_id text,
  student_name text,
  student_grade integer,
  student_class integer,
  student_number integer,
  category text,
  reason text,
  year integer,
  month integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = teacher_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    mo.id,
    mo.student_id,
    COALESCE(s.name, '-') as student_name,
    COALESCE(s.grade, 0) as student_grade,
    COALESCE(s.class, 0) as student_class,
    COALESCE(s.number, 0) as student_number,
    COALESCE(mo.category, '') as category,
    COALESCE(mo.reason, '') as reason,
    mo.year,
    mo.month,
    mo.created_at
  FROM public.monthly mo
  LEFT JOIN public.students s ON s.student_id = mo.student_id
  WHERE mo.teacher_id = teacher_id_input
  ORDER BY mo.created_at DESC
  LIMIT 50;
END;
$function$;