-- RPC function to get popular storybooks
CREATE OR REPLACE FUNCTION admin_get_popular_storybooks(admin_id_input UUID)
RETURNS TABLE (
  book_id UUID,
  book_number INTEGER,
  title TEXT,
  cover_image_url TEXT,
  total_readers BIGINT,
  completed_readers BIGINT,
  avg_rating NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM admins WHERE id = admin_id_input
    UNION
    SELECT 1 FROM teachers WHERE id = admin_id_input AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT 
    s.id as book_id,
    s.book_number,
    s.title,
    s.cover_image_url,
    COUNT(DISTINCT rh.student_id) as total_readers,
    COUNT(DISTINCT CASE WHEN rh.is_completed = true THEN rh.student_id END) as completed_readers,
    ROUND(AVG(sr.rating)::numeric, 1) as avg_rating
  FROM storybooks s
  LEFT JOIN storybook_reading_history rh ON s.id = rh.book_id
  LEFT JOIN storybook_reviews sr ON s.id = sr.book_id
  WHERE s.is_published = true
  GROUP BY s.id, s.book_number, s.title, s.cover_image_url
  ORDER BY total_readers DESC, completed_readers DESC
  LIMIT 20;
END;
$$;