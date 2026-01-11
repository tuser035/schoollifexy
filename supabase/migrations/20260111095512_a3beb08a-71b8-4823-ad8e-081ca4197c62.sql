-- YouTube 음악 청취 기록 테이블 생성
CREATE TABLE public.mindtalk_youtube_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  listened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.mindtalk_youtube_history ENABLE ROW LEVEL SECURITY;

-- 학생이 자신의 기록만 조회할 수 있는 정책
CREATE POLICY "Students can view their own youtube history" 
ON public.mindtalk_youtube_history 
FOR SELECT 
USING (true);

-- 학생이 자신의 기록을 추가할 수 있는 정책
CREATE POLICY "Students can insert their own youtube history" 
ON public.mindtalk_youtube_history 
FOR INSERT 
WITH CHECK (true);

-- 인덱스 생성
CREATE INDEX idx_mindtalk_youtube_history_student_id ON public.mindtalk_youtube_history(student_id);
CREATE INDEX idx_mindtalk_youtube_history_listened_at ON public.mindtalk_youtube_history(listened_at DESC);

-- RPC 함수: 학생의 YouTube 청취 기록 저장
CREATE OR REPLACE FUNCTION public.student_save_youtube_history(
  student_id_input TEXT,
  song_title_input TEXT,
  artist_name_input TEXT,
  youtube_url_input TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO mindtalk_youtube_history (student_id, song_title, artist_name, youtube_url)
  VALUES (student_id_input, song_title_input, artist_name_input, youtube_url_input)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- RPC 함수: 학생의 YouTube 청취 기록 조회
CREATE OR REPLACE FUNCTION public.student_get_youtube_history(
  student_id_input TEXT,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  song_title TEXT,
  artist_name TEXT,
  youtube_url TEXT,
  listened_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.song_title,
    h.artist_name,
    h.youtube_url,
    h.listened_at
  FROM mindtalk_youtube_history h
  WHERE h.student_id = student_id_input
  ORDER BY h.listened_at DESC
  LIMIT limit_count;
END;
$$;