-- Update insert_monthly_recommendation to set session internally instead of checking pre-existing session
CREATE OR REPLACE FUNCTION public.insert_monthly_recommendation(
  student_id_input text,
  teacher_id_input uuid,
  category_input text,
  reason_input text,
  image_url_input text[],
  year_input integer,
  month_input integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = teacher_id_input) THEN
    RAISE EXCEPTION '교사 권한이 없습니다';
  END IF;

  -- Set teacher session internally
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, true);

  -- Insert the monthly recommendation
  INSERT INTO public.monthly (
    student_id,
    teacher_id,
    category,
    reason,
    image_url,
    year,
    month
  ) VALUES (
    student_id_input,
    teacher_id_input,
    category_input,
    reason_input,
    image_url_input,
    year_input,
    month_input
  )
  RETURNING id INTO new_id;

  RETURN new_id::text;
END;
$$;