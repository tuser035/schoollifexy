-- Teacher update merit function
CREATE OR REPLACE FUNCTION public.teacher_update_merit(
  teacher_id_input uuid,
  merit_id_input uuid,
  category_input text,
  reason_input text,
  score_input integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify teacher exists and owns the record
  IF NOT EXISTS (
    SELECT 1 FROM public.merits 
    WHERE id = merit_id_input AND teacher_id = teacher_id_input
  ) THEN
    RAISE EXCEPTION '권한이 없거나 레코드를 찾을 수 없습니다';
  END IF;

  UPDATE public.merits
  SET category = category_input, reason = reason_input, score = score_input
  WHERE id = merit_id_input AND teacher_id = teacher_id_input;

  RETURN FOUND;
END;
$function$;

-- Teacher delete merit function
CREATE OR REPLACE FUNCTION public.teacher_delete_merit(
  teacher_id_input uuid,
  merit_id_input uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify teacher exists and owns the record
  IF NOT EXISTS (
    SELECT 1 FROM public.merits 
    WHERE id = merit_id_input AND teacher_id = teacher_id_input
  ) THEN
    RAISE EXCEPTION '권한이 없거나 레코드를 찾을 수 없습니다';
  END IF;

  DELETE FROM public.merits
  WHERE id = merit_id_input AND teacher_id = teacher_id_input;

  RETURN FOUND;
END;
$function$;

-- Teacher update demerit function
CREATE OR REPLACE FUNCTION public.teacher_update_demerit(
  teacher_id_input uuid,
  demerit_id_input uuid,
  category_input text,
  reason_input text,
  score_input integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.demerits 
    WHERE id = demerit_id_input AND teacher_id = teacher_id_input
  ) THEN
    RAISE EXCEPTION '권한이 없거나 레코드를 찾을 수 없습니다';
  END IF;

  UPDATE public.demerits
  SET category = category_input, reason = reason_input, score = score_input
  WHERE id = demerit_id_input AND teacher_id = teacher_id_input;

  RETURN FOUND;
END;
$function$;

-- Teacher delete demerit function
CREATE OR REPLACE FUNCTION public.teacher_delete_demerit(
  teacher_id_input uuid,
  demerit_id_input uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.demerits 
    WHERE id = demerit_id_input AND teacher_id = teacher_id_input
  ) THEN
    RAISE EXCEPTION '권한이 없거나 레코드를 찾을 수 없습니다';
  END IF;

  DELETE FROM public.demerits
  WHERE id = demerit_id_input AND teacher_id = teacher_id_input;

  RETURN FOUND;
END;
$function$;

-- Teacher update monthly function
CREATE OR REPLACE FUNCTION public.teacher_update_monthly(
  teacher_id_input uuid,
  monthly_id_input uuid,
  category_input text,
  reason_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.monthly 
    WHERE id = monthly_id_input AND teacher_id = teacher_id_input
  ) THEN
    RAISE EXCEPTION '권한이 없거나 레코드를 찾을 수 없습니다';
  END IF;

  UPDATE public.monthly
  SET category = category_input, reason = reason_input
  WHERE id = monthly_id_input AND teacher_id = teacher_id_input;

  RETURN FOUND;
END;
$function$;

-- Teacher delete monthly function
CREATE OR REPLACE FUNCTION public.teacher_delete_monthly(
  teacher_id_input uuid,
  monthly_id_input uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.monthly 
    WHERE id = monthly_id_input AND teacher_id = teacher_id_input
  ) THEN
    RAISE EXCEPTION '권한이 없거나 레코드를 찾을 수 없습니다';
  END IF;

  DELETE FROM public.monthly
  WHERE id = monthly_id_input AND teacher_id = teacher_id_input;

  RETURN FOUND;
END;
$function$;