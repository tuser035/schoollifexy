-- 필사 기록 테이블 생성
CREATE TABLE public.poetry_transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  poem_id UUID NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.poetry_collections(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  match_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE public.poetry_transcriptions ENABLE ROW LEVEL SECURITY;

-- 학생 본인 조회 정책
CREATE POLICY "Students can view their own transcriptions"
ON public.poetry_transcriptions
FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

-- 학생 본인 삽입 정책
CREATE POLICY "Students can insert their own transcriptions"
ON public.poetry_transcriptions
FOR INSERT
WITH CHECK (student_id = current_setting('app.current_student_id', true));

-- 관리자 전체 조회 정책
CREATE POLICY "Admins can view all transcriptions"
ON public.poetry_transcriptions
FOR SELECT
USING (current_setting('app.current_admin_id', true) IS NOT NULL);

-- 필사 이미지 저장용 스토리지 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('poetry-transcriptions', 'poetry-transcriptions', true)
ON CONFLICT (id) DO NOTHING;

-- 스토리지 정책: 누구나 조회 가능
CREATE POLICY "Poetry transcription images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'poetry-transcriptions');

-- 스토리지 정책: 인증된 사용자 업로드 가능
CREATE POLICY "Anyone can upload poetry transcription images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'poetry-transcriptions');

-- 학생 필사 저장 RPC 함수
CREATE OR REPLACE FUNCTION student_save_poetry_transcription(
  student_id_input TEXT,
  poem_id_input UUID,
  collection_id_input UUID,
  image_url_input TEXT,
  match_percentage_input NUMERIC,
  is_verified_input BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  points_to_award INTEGER := 0;
BEGIN
  -- 50% 이상이면 포인트 부여
  IF is_verified_input AND match_percentage_input >= 50 THEN
    points_to_award := 1;
  END IF;

  INSERT INTO poetry_transcriptions (
    student_id,
    poem_id,
    collection_id,
    image_url,
    match_percentage,
    is_verified,
    points_awarded
  ) VALUES (
    student_id_input,
    poem_id_input,
    collection_id_input,
    image_url_input,
    match_percentage_input,
    is_verified_input,
    points_to_award
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 학생 필사 기록 조회 RPC 함수
CREATE OR REPLACE FUNCTION student_get_poetry_transcriptions(
  student_id_input TEXT,
  collection_id_input UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  poem_id UUID,
  poem_title TEXT,
  collection_id UUID,
  collection_title TEXT,
  image_url TEXT,
  match_percentage NUMERIC,
  is_verified BOOLEAN,
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
    pt.id,
    pt.poem_id,
    p.title AS poem_title,
    pt.collection_id,
    pc.title AS collection_title,
    pt.image_url,
    pt.match_percentage,
    pt.is_verified,
    pt.points_awarded,
    pt.created_at
  FROM poetry_transcriptions pt
  JOIN poems p ON pt.poem_id = p.id
  JOIN poetry_collections pc ON pt.collection_id = pc.id
  WHERE pt.student_id = student_id_input
    AND (collection_id_input IS NULL OR pt.collection_id = collection_id_input)
  ORDER BY pt.created_at DESC;
END;
$$;