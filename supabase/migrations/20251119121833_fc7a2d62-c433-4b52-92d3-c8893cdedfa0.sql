-- Create RPC function for teachers and admins to get class statistics
CREATE OR REPLACE FUNCTION public.get_class_monthly_statistics(
  user_id_input uuid,
  grade_input integer,
  class_input integer,
  year_input integer
)
RETURNS TABLE(
  month integer,
  merits_total integer,
  demerits_total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin or teacher
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = user_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = user_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Return monthly statistics for the specified class
  RETURN QUERY
  WITH student_list AS (
    SELECT student_id
    FROM public.students
    WHERE grade = grade_input AND class = class_input
  ),
  monthly_merits AS (
    SELECT 
      EXTRACT(MONTH FROM m.created_at)::integer as month,
      COALESCE(SUM(m.score), 0)::integer as total
    FROM public.merits m
    WHERE m.student_id IN (SELECT student_id FROM student_list)
      AND EXTRACT(YEAR FROM m.created_at) = year_input
    GROUP BY EXTRACT(MONTH FROM m.created_at)
  ),
  monthly_demerits AS (
    SELECT 
      EXTRACT(MONTH FROM d.created_at)::integer as month,
      COALESCE(SUM(d.score), 0)::integer as total
    FROM public.demerits d
    WHERE d.student_id IN (SELECT student_id FROM student_list)
      AND EXTRACT(YEAR FROM d.created_at) = year_input
    GROUP BY EXTRACT(MONTH FROM d.created_at)
  ),
  all_months AS (
    SELECT generate_series(1, 12) as month
  )
  SELECT 
    am.month,
    COALESCE(mm.total, 0)::integer as merits_total,
    COALESCE(md.total, 0)::integer as demerits_total
  FROM all_months am
  LEFT JOIN monthly_merits mm ON am.month = mm.month
  LEFT JOIN monthly_demerits md ON am.month = md.month
  ORDER BY am.month;
END;
$$;