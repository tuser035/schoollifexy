-- Remove old insert_monthly_recommendation function with text image_url parameter
-- Keep only the version with text[] image_url parameter

DROP FUNCTION IF EXISTS public.insert_monthly_recommendation(
  student_id_input text,
  teacher_id_input uuid,
  category_input text,
  reason_input text,
  image_url_input text,
  year_input integer,
  month_input integer
);