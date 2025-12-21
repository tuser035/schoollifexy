
-- Update admin_get_reading_statistics to include book_reports
CREATE OR REPLACE FUNCTION public.admin_get_reading_statistics(admin_id_input uuid)
 RETURNS TABLE(student_id text, student_name text, student_grade integer, student_class integer, student_number integer, total_books_read integer, completed_books integer, total_reviews integer, avg_rating numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    s.student_id,
    s.name as student_name,
    s.grade as student_grade,
    s.class as student_class,
    s.number as student_number,
    COALESCE(rh.total_books, 0)::INTEGER as total_books_read,
    COALESCE(rh.completed, 0)::INTEGER as completed_books,
    (COALESCE(rv.review_count, 0) + COALESCE(br.report_count, 0))::INTEGER as total_reviews,
    rv.avg_rating
  FROM students s
  LEFT JOIN (
    SELECT srh.student_id, COUNT(*) as total_books, SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
    FROM storybook_reading_history srh
    GROUP BY srh.student_id
  ) rh ON rh.student_id = s.student_id
  LEFT JOIN (
    SELECT srv.student_id, COUNT(*) as review_count, ROUND(AVG(rating), 1) as avg_rating
    FROM storybook_reviews srv
    GROUP BY srv.student_id
  ) rv ON rv.student_id = s.student_id
  LEFT JOIN (
    SELECT brt.student_id, COUNT(*) as report_count
    FROM book_reports brt
    GROUP BY brt.student_id
  ) br ON br.student_id = s.student_id
  WHERE rh.total_books > 0 OR rv.review_count > 0 OR br.report_count > 0
  ORDER BY s.grade, s.class, s.number;
END;
$function$;
