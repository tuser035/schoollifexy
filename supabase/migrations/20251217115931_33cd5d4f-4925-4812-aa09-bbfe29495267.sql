-- 동화책 테이블
CREATE TABLE public.storybooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  page_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 동화책 페이지 테이블
CREATE TABLE public.storybook_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.storybooks(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url TEXT,
  text_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(book_id, page_number)
);

-- 학생 읽기 기록 테이블
CREATE TABLE public.storybook_reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  book_id UUID NOT NULL REFERENCES public.storybooks(id) ON DELETE CASCADE,
  last_page INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, book_id)
);

-- RLS 활성화
ALTER TABLE public.storybooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storybook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storybook_reading_history ENABLE ROW LEVEL SECURITY;

-- 동화책 조회 (모든 사용자)
CREATE POLICY "Anyone can view published storybooks" 
ON public.storybooks FOR SELECT USING (is_published = true);

-- 동화책 페이지 조회
CREATE POLICY "Anyone can view storybook pages" 
ON public.storybook_pages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.storybooks WHERE id = book_id AND is_published = true)
);

-- 읽기 기록 정책
CREATE POLICY "Students can view own reading history" 
ON public.storybook_reading_history FOR SELECT USING (
  student_id = current_setting('app.current_student_id', true)
);

CREATE POLICY "Students can insert own reading history" 
ON public.storybook_reading_history FOR INSERT WITH CHECK (
  student_id = current_setting('app.current_student_id', true)
);

CREATE POLICY "Students can update own reading history" 
ON public.storybook_reading_history FOR UPDATE USING (
  student_id = current_setting('app.current_student_id', true)
);

-- 관리자용 RPC 함수들
CREATE OR REPLACE FUNCTION public.admin_get_storybooks(admin_id_input UUID)
RETURNS TABLE(
  id UUID,
  book_number INTEGER,
  title TEXT,
  cover_image_url TEXT,
  description TEXT,
  page_count INTEGER,
  is_published BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT s.id, s.book_number, s.title, s.cover_image_url, s.description, s.page_count, s.is_published, s.created_at
  FROM public.storybooks s
  ORDER BY s.book_number;
END;
$$;

-- 동화책 생성
CREATE OR REPLACE FUNCTION public.admin_insert_storybook(
  admin_id_input UUID,
  book_number_input INTEGER,
  title_input TEXT,
  description_input TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_book_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  INSERT INTO public.storybooks (book_number, title, description)
  VALUES (book_number_input, title_input, description_input)
  RETURNING id INTO new_book_id;

  RETURN new_book_id;
END;
$$;

-- 동화책 페이지 추가/수정
CREATE OR REPLACE FUNCTION public.admin_upsert_storybook_page(
  admin_id_input UUID,
  book_id_input UUID,
  page_number_input INTEGER,
  image_url_input TEXT DEFAULT NULL,
  text_content_input TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  page_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  INSERT INTO public.storybook_pages (book_id, page_number, image_url, text_content)
  VALUES (book_id_input, page_number_input, image_url_input, text_content_input)
  ON CONFLICT (book_id, page_number) DO UPDATE
  SET image_url = COALESCE(EXCLUDED.image_url, storybook_pages.image_url),
      text_content = COALESCE(EXCLUDED.text_content, storybook_pages.text_content),
      updated_at = now()
  RETURNING id INTO page_id;

  -- 페이지 수 업데이트
  UPDATE public.storybooks
  SET page_count = (SELECT COUNT(*) FROM public.storybook_pages WHERE book_id = book_id_input),
      updated_at = now()
  WHERE id = book_id_input;

  RETURN page_id;
END;
$$;

-- 동화책 발행 상태 변경
CREATE OR REPLACE FUNCTION public.admin_publish_storybook(
  admin_id_input UUID,
  book_id_input UUID,
  publish_input BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  UPDATE public.storybooks
  SET is_published = publish_input, updated_at = now()
  WHERE id = book_id_input;

  RETURN FOUND;
END;
$$;

-- 동화책 표지 이미지 업데이트
CREATE OR REPLACE FUNCTION public.admin_update_storybook_cover(
  admin_id_input UUID,
  book_id_input UUID,
  cover_image_url_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  UPDATE public.storybooks
  SET cover_image_url = cover_image_url_input, updated_at = now()
  WHERE id = book_id_input;

  RETURN FOUND;
END;
$$;

-- 동화책 삭제
CREATE OR REPLACE FUNCTION public.admin_delete_storybook(
  admin_id_input UUID,
  book_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  DELETE FROM public.storybooks WHERE id = book_id_input;

  RETURN FOUND;
END;
$$;

-- 동화책 페이지 조회 (관리자)
CREATE OR REPLACE FUNCTION public.admin_get_storybook_pages(
  admin_id_input UUID,
  book_id_input UUID
)
RETURNS TABLE(
  id UUID,
  page_number INTEGER,
  image_url TEXT,
  text_content TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT p.id, p.page_number, p.image_url, p.text_content
  FROM public.storybook_pages p
  WHERE p.book_id = book_id_input
  ORDER BY p.page_number;
END;
$$;

-- 학생용: 발행된 동화책 목록 조회
CREATE OR REPLACE FUNCTION public.student_get_storybooks(student_id_input TEXT)
RETURNS TABLE(
  id UUID,
  book_number INTEGER,
  title TEXT,
  cover_image_url TEXT,
  description TEXT,
  page_count INTEGER,
  last_page INTEGER,
  is_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.book_number,
    s.title,
    s.cover_image_url,
    s.description,
    s.page_count,
    COALESCE(r.last_page, 0) as last_page,
    COALESCE(r.is_completed, false) as is_completed
  FROM public.storybooks s
  LEFT JOIN public.storybook_reading_history r ON r.book_id = s.id AND r.student_id = student_id_input
  WHERE s.is_published = true
  ORDER BY s.book_number;
END;
$$;

-- 학생용: 동화책 페이지 조회
CREATE OR REPLACE FUNCTION public.student_get_storybook_pages(
  student_id_input TEXT,
  book_id_input UUID
)
RETURNS TABLE(
  id UUID,
  page_number INTEGER,
  image_url TEXT,
  text_content TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 발행된 책만 조회 가능
  IF NOT EXISTS (SELECT 1 FROM public.storybooks WHERE id = book_id_input AND is_published = true) THEN
    RAISE EXCEPTION '해당 동화책을 찾을 수 없습니다';
  END IF;

  RETURN QUERY
  SELECT p.id, p.page_number, p.image_url, p.text_content
  FROM public.storybook_pages p
  WHERE p.book_id = book_id_input
  ORDER BY p.page_number;
END;
$$;

-- 학생용: 읽기 진행 상황 저장
CREATE OR REPLACE FUNCTION public.student_update_reading_progress(
  student_id_input TEXT,
  book_id_input UUID,
  last_page_input INTEGER,
  is_completed_input BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.storybook_reading_history (student_id, book_id, last_page, is_completed, completed_at)
  VALUES (
    student_id_input, 
    book_id_input, 
    last_page_input, 
    is_completed_input,
    CASE WHEN is_completed_input THEN now() ELSE NULL END
  )
  ON CONFLICT (student_id, book_id) DO UPDATE
  SET last_page = last_page_input,
      is_completed = is_completed_input,
      completed_at = CASE WHEN is_completed_input AND storybook_reading_history.completed_at IS NULL THEN now() ELSE storybook_reading_history.completed_at END,
      updated_at = now();

  RETURN true;
END;
$$;

-- Storage bucket 생성
INSERT INTO storage.buckets (id, name, public) 
VALUES ('storybook-images', 'storybook-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책
CREATE POLICY "Anyone can view storybook images"
ON storage.objects FOR SELECT
USING (bucket_id = 'storybook-images');

CREATE POLICY "Admins can upload storybook images"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'storybook-images');