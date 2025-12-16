-- Drop existing function and recreate with recipient_student_id
DROP FUNCTION IF EXISTS public.admin_get_email_history(uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_email_history(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  sender_name text,
  sender_type text,
  recipient_email text,
  recipient_name text,
  recipient_student_id text,
  subject text,
  body text,
  sent_at timestamp with time zone,
  opened boolean,
  opened_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify that the caller is an admin or teacher
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session for RLS
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  RETURN QUERY
  SELECT 
    eh.id,
    eh.sender_name,
    eh.sender_type,
    eh.recipient_email,
    eh.recipient_name,
    eh.recipient_student_id,
    eh.subject,
    eh.body,
    eh.sent_at,
    eh.opened,
    eh.opened_at
  FROM public.email_history eh
  LEFT JOIN public.students s ON s.student_id = eh.recipient_student_id
  WHERE (search_text IS NULL OR 
         eh.recipient_name ILIKE '%' || search_text || '%' OR 
         eh.recipient_email ILIKE '%' || search_text || '%' OR
         eh.subject ILIKE '%' || search_text || '%' OR
         eh.sender_name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY eh.sent_at DESC
  LIMIT 500;
END;
$function$;