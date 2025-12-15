-- Drop and recreate teacher_get_email_history to include recipient_student_id
DROP FUNCTION IF EXISTS public.teacher_get_email_history(uuid);

CREATE FUNCTION public.teacher_get_email_history(teacher_id_input uuid)
 RETURNS TABLE(id uuid, recipient_name text, recipient_email text, recipient_student_id text, subject text, body text, sent_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 교사 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = teacher_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    eh.id,
    eh.recipient_name,
    eh.recipient_email,
    eh.recipient_student_id,
    eh.subject,
    eh.body,
    eh.sent_at
  FROM public.email_history eh
  WHERE eh.sender_id = teacher_id_input
    AND eh.sender_type = 'teacher'
  ORDER BY eh.sent_at DESC
  LIMIT 100;
END;
$function$;