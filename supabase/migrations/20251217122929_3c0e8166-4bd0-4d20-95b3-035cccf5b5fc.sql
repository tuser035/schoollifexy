-- 기존 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS public.student_get_reviews(TEXT);

CREATE FUNCTION public.student_get_reviews(student_id_input TEXT)
RETURNS TABLE(
  id UUID,
  book_id UUID,
  book_title TEXT,
  content TEXT,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  RETURN QUERY
  SELECT 
    r.id,
    r.book_id,
    sb.title as book_title,
    r.content,
    r.rating,
    r.created_at,
    COALESCE(r.is_public, false) as is_public
  FROM storybook_reviews r
  JOIN storybooks sb ON sb.id = r.book_id
  WHERE r.student_id = student_id_input
  ORDER BY r.created_at DESC;
END;
$$;