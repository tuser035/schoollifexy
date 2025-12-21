-- First drop the existing function
DROP FUNCTION IF EXISTS public.student_get_storybooks(text);

-- Then recreate with category included
CREATE FUNCTION public.student_get_storybooks(student_id_input text)
RETURNS TABLE(
  id uuid,
  book_number integer,
  title text,
  subtitle text,
  cover_image_url text,
  description text,
  external_url text,
  page_count integer,
  last_page integer,
  is_completed boolean,
  category text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set student session for RLS
  PERFORM set_student_session(student_id_input);
  
  RETURN QUERY
  SELECT 
    s.id,
    s.book_number,
    s.title,
    s.subtitle,
    s.cover_image_url,
    s.description,
    s.external_url,
    COALESCE(s.page_count, 0) as page_count,
    COALESCE(rh.last_page, 1) as last_page,
    COALESCE(rh.is_completed, false) as is_completed,
    COALESCE(s.category, 'recommended') as category
  FROM storybooks s
  LEFT JOIN storybook_reading_history rh 
    ON s.id = rh.book_id AND rh.student_id = student_id_input
  WHERE s.is_published = true
  ORDER BY s.category, s.book_number;
END;
$$;