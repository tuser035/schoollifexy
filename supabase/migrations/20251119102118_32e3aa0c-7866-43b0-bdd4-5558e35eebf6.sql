-- Convert image_url columns from text to text[] for multiple image support
ALTER TABLE public.merits 
ALTER COLUMN image_url TYPE text[] 
USING CASE 
  WHEN image_url IS NULL THEN NULL 
  ELSE ARRAY[image_url] 
END;

ALTER TABLE public.demerits 
ALTER COLUMN image_url TYPE text[] 
USING CASE 
  WHEN image_url IS NULL THEN NULL 
  ELSE ARRAY[image_url] 
END;

ALTER TABLE public.monthly 
ALTER COLUMN image_url TYPE text[] 
USING CASE 
  WHEN image_url IS NULL THEN NULL 
  ELSE ARRAY[image_url] 
END;

-- Update insert_monthly_recommendation function to accept array
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
  -- Check if teacher session is set
  IF current_setting('app.current_teacher_id', true) IS NULL THEN
    RAISE EXCEPTION 'Teacher session not set';
  END IF;

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