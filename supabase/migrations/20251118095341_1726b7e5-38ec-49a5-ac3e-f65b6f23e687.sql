-- Fix session setting functions to persist across the entire connection
-- Change the third parameter of set_config from 'false' to 'true' to make it session-level

CREATE OR REPLACE FUNCTION public.set_admin_session(admin_id_input uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set to true so the setting persists for the entire database session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_teacher_session(teacher_id_input uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set to true so the setting persists for the entire database session
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_student_session(student_id_input text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set to true so the setting persists for the entire database session
  PERFORM set_config('app.current_student_id', student_id_input, true);
END;
$function$;