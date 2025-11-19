-- Create student data retrieval functions that maintain session context

CREATE OR REPLACE FUNCTION public.student_get_merits(student_id_input text)
RETURNS TABLE(
  id uuid,
  student_id text,
  teacher_id uuid,
  category text,
  score integer,
  reason text,
  created_at timestamptz,
  image_url text[],
  teacher_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set student session for RLS
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  -- Return merits data with teacher name
  RETURN QUERY
  SELECT 
    m.id,
    m.student_id,
    m.teacher_id,
    m.category,
    m.score,
    m.reason,
    m.created_at,
    m.image_url,
    COALESCE(t.name, '-') as teacher_name
  FROM public.merits m
  LEFT JOIN public.teachers t ON m.teacher_id = t.id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_get_demerits(student_id_input text)
RETURNS TABLE(
  id uuid,
  student_id text,
  teacher_id uuid,
  category text,
  score integer,
  reason text,
  created_at timestamptz,
  image_url text[],
  teacher_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set student session for RLS
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  -- Return demerits data with teacher name
  RETURN QUERY
  SELECT 
    d.id,
    d.student_id,
    d.teacher_id,
    d.category,
    d.score,
    d.reason,
    d.created_at,
    d.image_url,
    COALESCE(t.name, '-') as teacher_name
  FROM public.demerits d
  LEFT JOIN public.teachers t ON d.teacher_id = t.id
  WHERE d.student_id = student_id_input
  ORDER BY d.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_get_monthly(student_id_input text)
RETURNS TABLE(
  id uuid,
  student_id text,
  teacher_id uuid,
  category text,
  reason text,
  year integer,
  month integer,
  created_at timestamptz,
  image_url text[],
  teacher_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set student session for RLS
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  -- Return monthly data with teacher name
  RETURN QUERY
  SELECT 
    m.id,
    m.student_id,
    m.teacher_id,
    m.category,
    m.reason,
    m.year,
    m.month,
    m.created_at,
    m.image_url,
    COALESCE(t.name, '-') as teacher_name
  FROM public.monthly m
  LEFT JOIN public.teachers t ON m.teacher_id = t.id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$$;