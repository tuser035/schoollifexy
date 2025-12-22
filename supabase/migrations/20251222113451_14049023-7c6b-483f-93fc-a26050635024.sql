-- 시 낭독 녹음 테이블
CREATE TABLE public.poetry_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  collection_id UUID NOT NULL REFERENCES public.poetry_collections(id) ON DELETE CASCADE,
  poem_id UUID NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_seconds INTEGER,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 시집 완독 보너스 테이블
CREATE TABLE public.poetry_completion_bonus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  collection_id UUID NOT NULL REFERENCES public.poetry_collections(id) ON DELETE CASCADE,
  bonus_points INTEGER NOT NULL DEFAULT 50,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, collection_id)
);

-- RLS 활성화
ALTER TABLE public.poetry_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poetry_completion_bonus ENABLE ROW LEVEL SECURITY;

-- 녹음 저장소 버킷 생성
INSERT INTO storage.buckets (id, name, public) VALUES ('poetry-recordings', 'poetry-recordings', true);

-- 스토리지 RLS 정책
CREATE POLICY "Anyone can view poetry recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'poetry-recordings');

CREATE POLICY "Students can upload poetry recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'poetry-recordings');

-- 학생 녹음 저장 함수
CREATE OR REPLACE FUNCTION student_save_poetry_recording(
  student_id_input TEXT,
  collection_id_input UUID,
  poem_id_input UUID,
  recording_url_input TEXT,
  duration_seconds_input INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recording_id UUID;
  v_points INTEGER := 10;
  v_collection_poem_count INTEGER;
  v_student_recording_count INTEGER;
  v_bonus_awarded BOOLEAN := false;
  v_bonus_points INTEGER := 50;
BEGIN
  -- 이미 해당 시에 대한 녹음이 있는지 확인
  IF EXISTS (
    SELECT 1 FROM poetry_recordings 
    WHERE student_id = student_id_input 
    AND poem_id = poem_id_input
  ) THEN
    RETURN json_build_object('success', false, 'message', '이미 이 시에 대한 녹음이 있습니다.');
  END IF;

  -- 녹음 저장
  INSERT INTO poetry_recordings (student_id, collection_id, poem_id, recording_url, duration_seconds, points_awarded)
  VALUES (student_id_input, collection_id_input, poem_id_input, recording_url_input, duration_seconds_input, v_points)
  RETURNING id INTO v_recording_id;

  -- 시집의 총 시 개수 확인
  SELECT poem_count INTO v_collection_poem_count
  FROM poetry_collections WHERE id = collection_id_input;

  -- 학생이 해당 시집에서 녹음한 시 개수 확인
  SELECT COUNT(*) INTO v_student_recording_count
  FROM poetry_recordings
  WHERE student_id = student_id_input AND collection_id = collection_id_input;

  -- 시집 완독 시 보너스 지급
  IF v_student_recording_count >= v_collection_poem_count THEN
    INSERT INTO poetry_completion_bonus (student_id, collection_id, bonus_points)
    VALUES (student_id_input, collection_id_input, v_bonus_points)
    ON CONFLICT (student_id, collection_id) DO NOTHING;
    
    IF FOUND THEN
      v_bonus_awarded := true;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'recording_id', v_recording_id,
    'points', v_points,
    'bonus_awarded', v_bonus_awarded,
    'bonus_points', CASE WHEN v_bonus_awarded THEN v_bonus_points ELSE 0 END,
    'total_recordings', v_student_recording_count,
    'total_poems', v_collection_poem_count
  );
END;
$$;

-- 학생의 시 녹음 목록 조회 함수
CREATE OR REPLACE FUNCTION student_get_poetry_recordings(
  student_id_input TEXT,
  collection_id_input UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  poem_id UUID,
  poem_title TEXT,
  collection_id UUID,
  collection_title TEXT,
  recording_url TEXT,
  duration_seconds INTEGER,
  points_awarded INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.poem_id,
    p.title as poem_title,
    pr.collection_id,
    pc.title as collection_title,
    pr.recording_url,
    pr.duration_seconds,
    pr.points_awarded,
    pr.created_at
  FROM poetry_recordings pr
  JOIN poems p ON pr.poem_id = p.id
  JOIN poetry_collections pc ON pr.collection_id = pc.id
  WHERE pr.student_id = student_id_input
  AND (collection_id_input IS NULL OR pr.collection_id = collection_id_input)
  ORDER BY pr.created_at DESC;
END;
$$;