-- Create storybook_reviews table for student book reports
CREATE TABLE public.storybook_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.storybooks(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storybook_reviews ENABLE ROW LEVEL SECURITY;

-- Students can view own reviews
CREATE POLICY "Students can view own reviews"
ON public.storybook_reviews FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

-- Students can insert own reviews
CREATE POLICY "Students can insert own reviews"
ON public.storybook_reviews FOR INSERT
WITH CHECK (student_id = current_setting('app.current_student_id', true));

-- Students can update own reviews
CREATE POLICY "Students can update own reviews"
ON public.storybook_reviews FOR UPDATE
USING (student_id = current_setting('app.current_student_id', true));

-- Students can delete own reviews
CREATE POLICY "Students can delete own reviews"
ON public.storybook_reviews FOR DELETE
USING (student_id = current_setting('app.current_student_id', true));

-- Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
ON public.storybook_reviews FOR SELECT
USING (
  (current_setting('app.current_admin_id', true) IS NOT NULL AND current_setting('app.current_admin_id', true) <> '')
);

-- Create function for student to save review
CREATE OR REPLACE FUNCTION public.student_save_review(
  student_id_input TEXT,
  book_id_input UUID,
  content_input TEXT,
  rating_input INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  review_id UUID;
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  INSERT INTO storybook_reviews (student_id, book_id, content, rating)
  VALUES (student_id_input, book_id_input, content_input, rating_input)
  ON CONFLICT (book_id, student_id) DO UPDATE
  SET content = EXCLUDED.content, rating = EXCLUDED.rating, updated_at = now()
  RETURNING id INTO review_id;
  
  RETURN review_id;
END;
$$;

-- Add unique constraint for one review per student per book
ALTER TABLE public.storybook_reviews ADD CONSTRAINT unique_student_book_review UNIQUE (book_id, student_id);

-- Create function to get student's reviews
CREATE OR REPLACE FUNCTION public.student_get_reviews(student_id_input TEXT)
RETURNS TABLE(
  id UUID,
  book_id UUID,
  book_title TEXT,
  content TEXT,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  RETURN QUERY
  SELECT r.id, r.book_id, b.title as book_title, r.content, r.rating, r.created_at
  FROM storybook_reviews r
  JOIN storybooks b ON b.id = r.book_id
  WHERE r.student_id = student_id_input
  ORDER BY r.created_at DESC;
END;
$$;

-- Create function for admin to get reading statistics
CREATE OR REPLACE FUNCTION public.admin_get_reading_statistics(admin_id_input UUID)
RETURNS TABLE(
  student_id TEXT,
  student_name TEXT,
  student_grade INTEGER,
  student_class INTEGER,
  student_number INTEGER,
  total_books_read INTEGER,
  completed_books INTEGER,
  total_reviews INTEGER,
  avg_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE(rv.review_count, 0)::INTEGER as total_reviews,
    rv.avg_rating
  FROM students s
  LEFT JOIN (
    SELECT student_id, COUNT(*) as total_books, SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
    FROM storybook_reading_history
    GROUP BY student_id
  ) rh ON rh.student_id = s.student_id
  LEFT JOIN (
    SELECT student_id, COUNT(*) as review_count, ROUND(AVG(rating), 1) as avg_rating
    FROM storybook_reviews
    GROUP BY student_id
  ) rv ON rv.student_id = s.student_id
  WHERE rh.total_books > 0 OR rv.review_count > 0
  ORDER BY s.grade, s.class, s.number;
END;
$$;