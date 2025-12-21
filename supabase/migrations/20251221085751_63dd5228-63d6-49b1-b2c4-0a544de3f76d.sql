
-- 시집 테이블 생성
CREATE TABLE public.poetry_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  poet TEXT NOT NULL,
  cover_image_url TEXT,
  hashtags TEXT[],
  is_published BOOLEAN DEFAULT false,
  poem_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 시 테이블 생성
CREATE TABLE public.poems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.poetry_collections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  poem_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 시집 읽기 기록 테이블
CREATE TABLE public.poetry_reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.poetry_collections(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  last_poem_order INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.poetry_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poetry_reading_history ENABLE ROW LEVEL SECURITY;

-- 시집 RLS 정책
CREATE POLICY "Admins can manage poetry collections" ON public.poetry_collections
  FOR ALL USING (
    current_setting('app.current_admin_id', true) IS NOT NULL 
    AND current_setting('app.current_admin_id', true) <> ''
  );

CREATE POLICY "Students can view published poetry collections" ON public.poetry_collections
  FOR SELECT USING (is_published = true);

-- 시 RLS 정책
CREATE POLICY "Admins can manage poems" ON public.poems
  FOR ALL USING (
    current_setting('app.current_admin_id', true) IS NOT NULL 
    AND current_setting('app.current_admin_id', true) <> ''
  );

CREATE POLICY "Students can view poems of published collections" ON public.poems
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.poetry_collections 
      WHERE poetry_collections.id = poems.collection_id 
      AND poetry_collections.is_published = true
    )
  );

-- 읽기 기록 RLS 정책
CREATE POLICY "Students can manage own reading history" ON public.poetry_reading_history
  FOR ALL USING (student_id = current_setting('app.current_student_id', true));

-- 인덱스 생성
CREATE INDEX idx_poems_collection_id ON public.poems(collection_id);
CREATE INDEX idx_poems_order ON public.poems(collection_id, poem_order);
CREATE INDEX idx_poetry_reading_student ON public.poetry_reading_history(student_id);

-- 관리자용 시집 목록 조회 함수
CREATE OR REPLACE FUNCTION admin_get_poetry_collections(admin_id_input TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  poet TEXT,
  cover_image_url TEXT,
  hashtags TEXT[],
  is_published BOOLEAN,
  poem_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_admin_session(admin_id_input::uuid);
  
  RETURN QUERY
  SELECT 
    pc.id,
    pc.title,
    pc.poet,
    pc.cover_image_url,
    pc.hashtags,
    pc.is_published,
    pc.poem_count,
    pc.created_at
  FROM poetry_collections pc
  ORDER BY pc.created_at DESC;
END;
$$;

-- 관리자용 시집 추가 함수
CREATE OR REPLACE FUNCTION admin_insert_poetry_collection(
  admin_id_input TEXT,
  title_input TEXT,
  poet_input TEXT,
  cover_image_url_input TEXT DEFAULT NULL,
  hashtags_input TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  PERFORM set_admin_session(admin_id_input::uuid);
  
  INSERT INTO poetry_collections (title, poet, cover_image_url, hashtags)
  VALUES (title_input, poet_input, cover_image_url_input, hashtags_input)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- 관리자용 시 추가 함수
CREATE OR REPLACE FUNCTION admin_insert_poem(
  admin_id_input TEXT,
  collection_id_input UUID,
  title_input TEXT,
  content_input TEXT,
  poem_order_input INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  PERFORM set_admin_session(admin_id_input::uuid);
  
  INSERT INTO poems (collection_id, title, content, poem_order)
  VALUES (collection_id_input, title_input, content_input, poem_order_input)
  RETURNING id INTO new_id;
  
  -- 시집의 시 개수 업데이트
  UPDATE poetry_collections 
  SET poem_count = (SELECT COUNT(*) FROM poems WHERE poems.collection_id = collection_id_input),
      updated_at = now()
  WHERE id = collection_id_input;
  
  RETURN new_id;
END;
$$;

-- 관리자용 시집 발행 상태 변경 함수
CREATE OR REPLACE FUNCTION admin_publish_poetry_collection(
  admin_id_input TEXT,
  collection_id_input UUID,
  publish_input BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_admin_session(admin_id_input::uuid);
  
  UPDATE poetry_collections 
  SET is_published = publish_input, updated_at = now()
  WHERE id = collection_id_input;
  
  RETURN FOUND;
END;
$$;

-- 관리자용 시집 삭제 함수
CREATE OR REPLACE FUNCTION admin_delete_poetry_collection(
  admin_id_input TEXT,
  collection_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_admin_session(admin_id_input::uuid);
  
  DELETE FROM poetry_collections WHERE id = collection_id_input;
  
  RETURN FOUND;
END;
$$;

-- 관리자용 시집의 시 목록 조회 함수
CREATE OR REPLACE FUNCTION admin_get_poems(
  admin_id_input TEXT,
  collection_id_input UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  poem_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_admin_session(admin_id_input::uuid);
  
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
    p.poem_order,
    p.created_at
  FROM poems p
  WHERE p.collection_id = collection_id_input
  ORDER BY p.poem_order;
END;
$$;

-- 학생용 시집 목록 조회 함수
CREATE OR REPLACE FUNCTION student_get_poetry_collections(student_id_input TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  poet TEXT,
  cover_image_url TEXT,
  hashtags TEXT[],
  poem_count INTEGER,
  last_poem_order INTEGER,
  is_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_student_session(student_id_input);
  
  RETURN QUERY
  SELECT 
    pc.id,
    pc.title,
    pc.poet,
    pc.cover_image_url,
    pc.hashtags,
    pc.poem_count,
    COALESCE(prh.last_poem_order, 0) as last_poem_order,
    COALESCE(prh.is_completed, false) as is_completed
  FROM poetry_collections pc
  LEFT JOIN poetry_reading_history prh ON pc.id = prh.collection_id AND prh.student_id = student_id_input
  WHERE pc.is_published = true
  ORDER BY pc.created_at DESC;
END;
$$;

-- 학생용 시 목록 조회 함수
CREATE OR REPLACE FUNCTION student_get_poems(
  student_id_input TEXT,
  collection_id_input UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  poem_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_student_session(student_id_input);
  
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
    p.poem_order
  FROM poems p
  JOIN poetry_collections pc ON p.collection_id = pc.id
  WHERE p.collection_id = collection_id_input AND pc.is_published = true
  ORDER BY p.poem_order;
END;
$$;

-- 학생용 읽기 진행 상황 업데이트 함수
CREATE OR REPLACE FUNCTION student_update_poetry_reading_progress(
  student_id_input TEXT,
  collection_id_input UUID,
  last_poem_order_input INTEGER,
  is_completed_input BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_student_session(student_id_input);
  
  INSERT INTO poetry_reading_history (student_id, collection_id, last_poem_order, is_completed, completed_at)
  VALUES (
    student_id_input, 
    collection_id_input, 
    last_poem_order_input, 
    is_completed_input,
    CASE WHEN is_completed_input THEN now() ELSE NULL END
  )
  ON CONFLICT (student_id, collection_id) 
  DO UPDATE SET 
    last_poem_order = last_poem_order_input,
    is_completed = is_completed_input,
    completed_at = CASE WHEN is_completed_input AND poetry_reading_history.completed_at IS NULL THEN now() ELSE poetry_reading_history.completed_at END,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- 유니크 제약 조건 추가
ALTER TABLE public.poetry_reading_history 
ADD CONSTRAINT poetry_reading_history_unique UNIQUE (student_id, collection_id);
