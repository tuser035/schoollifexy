-- 페이지 북마크 테이블 생성
CREATE TABLE public.storybook_page_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  book_id UUID NOT NULL REFERENCES public.storybooks(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, book_id, page_number)
);

-- RLS 활성화
ALTER TABLE public.storybook_page_bookmarks ENABLE ROW LEVEL SECURITY;

-- 학생 본인 북마크 정책
CREATE POLICY "Students can view own bookmarks"
ON public.storybook_page_bookmarks FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can insert own bookmarks"
ON public.storybook_page_bookmarks FOR INSERT
WITH CHECK (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can delete own bookmarks"
ON public.storybook_page_bookmarks FOR DELETE
USING (student_id = current_setting('app.current_student_id', true));

-- 독후감 공개 열 추가
ALTER TABLE public.storybook_reviews ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 공개 독후감 조회 정책 추가
CREATE POLICY "Anyone can view public reviews"
ON public.storybook_reviews FOR SELECT
USING (is_public = true);

-- 북마크 관리 함수
CREATE OR REPLACE FUNCTION public.student_toggle_page_bookmark(
  student_id_input TEXT,
  book_id_input UUID,
  page_number_input INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bookmark_exists BOOLEAN;
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  SELECT EXISTS(
    SELECT 1 FROM storybook_page_bookmarks 
    WHERE student_id = student_id_input 
    AND book_id = book_id_input 
    AND page_number = page_number_input
  ) INTO bookmark_exists;
  
  IF bookmark_exists THEN
    DELETE FROM storybook_page_bookmarks 
    WHERE student_id = student_id_input 
    AND book_id = book_id_input 
    AND page_number = page_number_input;
    RETURN false;
  ELSE
    INSERT INTO storybook_page_bookmarks (student_id, book_id, page_number)
    VALUES (student_id_input, book_id_input, page_number_input);
    RETURN true;
  END IF;
END;
$$;

-- 학생 북마크 조회 함수
CREATE OR REPLACE FUNCTION public.student_get_page_bookmarks(
  student_id_input TEXT,
  book_id_input UUID
)
RETURNS TABLE(page_number INTEGER, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.page_number, b.created_at
  FROM storybook_page_bookmarks b
  WHERE b.student_id = student_id_input AND b.book_id = book_id_input
  ORDER BY b.page_number;
END;
$$;

-- 공개 독후감 조회 함수
CREATE OR REPLACE FUNCTION public.get_public_reviews(book_id_input UUID)
RETURNS TABLE(
  id UUID,
  student_id TEXT,
  student_name TEXT,
  content TEXT,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.student_id,
    COALESCE(s.name, '익명') as student_name,
    r.content,
    r.rating,
    r.created_at
  FROM storybook_reviews r
  LEFT JOIN students s ON s.student_id = r.student_id
  WHERE r.book_id = book_id_input AND r.is_public = true
  ORDER BY r.created_at DESC;
END;
$$;

-- 독후감 공개 설정 함수
CREATE OR REPLACE FUNCTION public.student_update_review_visibility(
  student_id_input TEXT,
  review_id_input UUID,
  is_public_input BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE storybook_reviews
  SET is_public = is_public_input, updated_at = now()
  WHERE id = review_id_input AND student_id = student_id_input;
  
  RETURN FOUND;
END;
$$;