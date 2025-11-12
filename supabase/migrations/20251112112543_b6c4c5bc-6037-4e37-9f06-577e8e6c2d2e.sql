-- Create function to insert monthly recommendation with session set
CREATE OR REPLACE FUNCTION public.insert_monthly_recommendation(
  student_id_input text,
  teacher_id_input uuid,
  category_input text,
  reason_input text,
  image_url_input text,
  year_input integer,
  month_input integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Set session teacher id for RLS
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, true);

  INSERT INTO public.monthly (
    student_id, teacher_id, category, reason, image_url, year, month
  ) VALUES (
    student_id_input, teacher_id_input, category_input, reason_input, image_url_input, year_input, month_input
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;