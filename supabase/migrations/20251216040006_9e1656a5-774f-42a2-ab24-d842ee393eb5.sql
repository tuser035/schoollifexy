-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.teacher_get_email_history(uuid);

-- teacher_get_email_history RPC 함수 재생성 (attachment_urls 반환 추가)
CREATE OR REPLACE FUNCTION public.teacher_get_email_history(teacher_id_input uuid)
 RETURNS TABLE(id uuid, recipient_name text, recipient_email text, recipient_student_id text, subject text, body text, sent_at timestamp with time zone, attachment_urls text[])
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
    eh.sent_at,
    eh.attachment_urls
  FROM public.email_history eh
  WHERE eh.sender_id = teacher_id_input
    AND eh.sender_type = 'teacher'
  ORDER BY eh.sent_at DESC
  LIMIT 100;
END;
$function$;