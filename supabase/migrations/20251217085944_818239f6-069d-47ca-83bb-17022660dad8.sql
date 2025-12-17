-- 학생별 음악 재생 히스토리 테이블
CREATE TABLE public.mindtalk_play_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  music_id UUID NOT NULL REFERENCES public.mindtalk_music(id) ON DELETE CASCADE,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 인덱스 추가
CREATE INDEX idx_mindtalk_play_history_student ON public.mindtalk_play_history(student_id);
CREATE INDEX idx_mindtalk_play_history_played_at ON public.mindtalk_play_history(played_at DESC);

-- RLS 활성화
ALTER TABLE public.mindtalk_play_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Students can view own history" ON public.mindtalk_play_history
  FOR SELECT USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can insert own history" ON public.mindtalk_play_history
  FOR INSERT WITH CHECK (student_id = current_setting('app.current_student_id', true));

-- 재생 히스토리 저장 함수
CREATE OR REPLACE FUNCTION public.student_save_play_history(student_id_input TEXT, music_id_input UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO mindtalk_play_history (student_id, music_id)
  VALUES (student_id_input, music_id_input)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- 재생 히스토리 조회 함수 (최근 20곡, 중복 제거)
CREATE OR REPLACE FUNCTION public.student_get_play_history(student_id_input TEXT)
RETURNS TABLE(music_id UUID, title TEXT, category TEXT, file_path TEXT, duration_seconds INTEGER, last_played_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (h.music_id)
    h.music_id,
    m.title,
    m.category,
    m.file_path,
    m.duration_seconds,
    h.played_at as last_played_at
  FROM mindtalk_play_history h
  JOIN mindtalk_music m ON m.id = h.music_id
  WHERE h.student_id = student_id_input AND m.is_active = true
  ORDER BY h.music_id, h.played_at DESC
  LIMIT 20;
END;
$$;