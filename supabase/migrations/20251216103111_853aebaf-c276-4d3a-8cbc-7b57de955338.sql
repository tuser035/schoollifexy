-- RPC function for admins/teachers to view mindtalk messages
CREATE OR REPLACE FUNCTION public.admin_get_mindtalk_messages(
  admin_id_input uuid,
  student_id_input text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  student_id text,
  student_name text,
  student_grade integer,
  student_class integer,
  student_number integer,
  role text,
  content text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin or teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.student_id,
    s.name as student_name,
    s.grade as student_grade,
    s.class as student_class,
    s.number as student_number,
    m.role,
    m.content,
    m.created_at
  FROM public.mindtalk_messages m
  LEFT JOIN public.students s ON s.student_id = m.student_id
  WHERE (student_id_input IS NULL OR m.student_id = student_id_input)
  ORDER BY m.student_id, m.created_at ASC;
END;
$$;

-- RPC function to get mindtalk alerts summary
CREATE OR REPLACE FUNCTION public.admin_get_mindtalk_alerts(
  admin_id_input uuid
)
RETURNS TABLE(
  id uuid,
  student_id text,
  student_name text,
  student_grade integer,
  student_class integer,
  student_number integer,
  dangerous_word_count integer,
  last_alert_sent_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin or teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.student_id,
    s.name as student_name,
    s.grade as student_grade,
    s.class as student_class,
    s.number as student_number,
    a.dangerous_word_count,
    a.last_alert_sent_at,
    a.updated_at
  FROM public.mindtalk_alerts a
  LEFT JOIN public.students s ON s.student_id = a.student_id
  WHERE a.dangerous_word_count > 0
  ORDER BY a.dangerous_word_count DESC, a.updated_at DESC;
END;
$$;