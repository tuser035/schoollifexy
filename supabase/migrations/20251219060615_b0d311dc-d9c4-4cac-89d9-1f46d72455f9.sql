-- 분기별 추천도서 테이블 생성
CREATE TABLE public.recommended_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  display_order INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(title, year, quarter)
);

-- RLS 활성화
ALTER TABLE public.recommended_books ENABLE ROW LEVEL SECURITY;

-- 관리자 전체 권한
CREATE POLICY "Admins can manage recommended books"
ON public.recommended_books
FOR ALL
USING (
  current_setting('app.current_admin_id', true) IS NOT NULL 
  AND current_setting('app.current_admin_id', true) <> ''
);

-- 학생 조회 권한 (활성화된 도서만)
CREATE POLICY "Students can view active recommended books"
ON public.recommended_books
FOR SELECT
USING (is_active = true);

-- 교사 조회 권한
CREATE POLICY "Teachers can view recommended books"
ON public.recommended_books
FOR SELECT
USING (
  current_setting('app.current_teacher_id', true) IS NOT NULL 
  AND current_setting('app.current_teacher_id', true) <> ''
);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_recommended_books_updated_at
BEFORE UPDATE ON public.recommended_books
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 관리자용 추천도서 조회 함수
CREATE OR REPLACE FUNCTION public.admin_get_recommended_books(
  admin_id_input UUID,
  year_filter INTEGER DEFAULT NULL,
  quarter_filter INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  description TEXT,
  year INTEGER,
  quarter INTEGER,
  display_order INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    rb.id,
    rb.title,
    rb.author,
    rb.description,
    rb.year,
    rb.quarter,
    rb.display_order,
    rb.is_active,
    rb.created_at
  FROM recommended_books rb
  WHERE (year_filter IS NULL OR rb.year = year_filter)
    AND (quarter_filter IS NULL OR rb.quarter = quarter_filter)
  ORDER BY rb.year DESC, rb.quarter DESC, rb.display_order ASC;
END;
$$;

-- 추천도서 추가 함수
CREATE OR REPLACE FUNCTION public.admin_insert_recommended_book(
  admin_id_input UUID,
  title_input TEXT,
  author_input TEXT DEFAULT NULL,
  description_input TEXT DEFAULT NULL,
  year_input INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  quarter_input INTEGER DEFAULT CEIL(EXTRACT(MONTH FROM CURRENT_DATE) / 3.0)::INTEGER,
  display_order_input INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  INSERT INTO recommended_books (title, author, description, year, quarter, display_order, created_by)
  VALUES (title_input, author_input, description_input, year_input, quarter_input, display_order_input, admin_id_input)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- 추천도서 수정 함수
CREATE OR REPLACE FUNCTION public.admin_update_recommended_book(
  admin_id_input UUID,
  book_id_input UUID,
  title_input TEXT,
  author_input TEXT DEFAULT NULL,
  description_input TEXT DEFAULT NULL,
  display_order_input INTEGER DEFAULT 1,
  is_active_input BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE recommended_books
  SET title = title_input,
      author = author_input,
      description = description_input,
      display_order = display_order_input,
      is_active = is_active_input
  WHERE id = book_id_input;
  
  RETURN FOUND;
END;
$$;

-- 추천도서 삭제 함수
CREATE OR REPLACE FUNCTION public.admin_delete_recommended_book(
  admin_id_input UUID,
  book_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  DELETE FROM recommended_books WHERE id = book_id_input;
  
  RETURN FOUND;
END;
$$;

-- 학생용 현재 분기 추천도서 조회 함수
CREATE OR REPLACE FUNCTION public.student_get_current_recommended_books(
  student_id_input TEXT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  description TEXT,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  current_quarter INTEGER := CEIL(EXTRACT(MONTH FROM CURRENT_DATE) / 3.0)::INTEGER;
BEGIN
  -- 학생 권한 확인
  IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = student_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    rb.id,
    rb.title,
    rb.author,
    rb.description,
    rb.display_order
  FROM recommended_books rb
  WHERE rb.year = current_year
    AND rb.quarter = current_quarter
    AND rb.is_active = true
  ORDER BY rb.display_order ASC;
END;
$$;