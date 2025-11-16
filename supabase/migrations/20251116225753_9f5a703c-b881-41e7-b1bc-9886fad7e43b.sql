-- Drop and recreate admin_get_teachers to include photo_url
DROP FUNCTION IF EXISTS public.admin_get_teachers(text, integer, integer, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_get_teachers(
  admin_id_input TEXT,
  search_text TEXT DEFAULT NULL,
  search_grade INTEGER DEFAULT NULL,
  search_class INTEGER DEFAULT NULL,
  search_department TEXT DEFAULT NULL,
  search_subject TEXT DEFAULT NULL,
  search_dept_name TEXT DEFAULT NULL,
  search_homeroom TEXT DEFAULT NULL
)
RETURNS TABLE (
  name TEXT,
  call_t TEXT,
  teacher_email TEXT,
  grade INTEGER,
  class INTEGER,
  is_homeroom BOOLEAN,
  dept_name TEXT,
  department TEXT,
  subject TEXT,
  photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input::uuid) THEN
    RAISE EXCEPTION 'Unauthorized';
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
    COALESCE(t.subject, '-') as subject,
    t.photo_url
  FROM public.teachers t
  LEFT JOIN public.departments d ON t.dept_code = d.code
  WHERE 
    (search_text IS NULL OR 
     t.name ILIKE '%' || search_text || '%' OR 
     t.call_t ILIKE '%' || search_text || '%' OR
     t.teacher_email ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
    AND (search_department IS NULL OR t.department ILIKE '%' || search_department || '%')
    AND (search_subject IS NULL OR t.subject ILIKE '%' || search_subject || '%')
    AND (search_dept_name IS NULL OR d.name ILIKE '%' || search_dept_name || '%')
    AND (search_homeroom IS NULL OR 
         (search_homeroom = 'true' AND t.is_homeroom = true) OR
         (search_homeroom = 'false' AND t.is_homeroom = false))
  ORDER BY t.name;
END;
$$;