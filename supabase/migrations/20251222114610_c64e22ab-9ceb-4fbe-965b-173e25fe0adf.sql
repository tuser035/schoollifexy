-- 관리자용 시 낭독 녹음 조회 함수
CREATE OR REPLACE FUNCTION public.admin_get_poetry_recordings(
  admin_id_input TEXT,
  collection_id_input UUID DEFAULT NULL,
  student_id_input TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  student_id TEXT,
  student_name TEXT,
  student_grade INTEGER,
  student_class INTEGER,
  student_number INTEGER,
  collection_id UUID,
  collection_title TEXT,
  poem_id UUID,
  poem_title TEXT,
  recording_url TEXT,
  duration_seconds INTEGER,
  points_awarded INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id::text = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    pr.id,
    pr.student_id,
    s.name AS student_name,
    s.grade AS student_grade,
    s.class AS student_class,
    s.number AS student_number,
    pr.collection_id,
    pc.title AS collection_title,
    pr.poem_id,
    p.title AS poem_title,
    pr.recording_url,
    pr.duration_seconds,
    pr.points_awarded,
    pr.created_at
  FROM poetry_recordings pr
  JOIN students s ON s.student_id = pr.student_id
  JOIN poetry_collections pc ON pc.id = pr.collection_id
  JOIN poems p ON p.id = pr.poem_id
  WHERE 
    (collection_id_input IS NULL OR pr.collection_id = collection_id_input)
    AND (student_id_input IS NULL OR pr.student_id = student_id_input)
  ORDER BY pr.created_at DESC;
END;
$$;

-- 관리자용 시 낭독 통계 조회 함수
CREATE OR REPLACE FUNCTION public.admin_get_poetry_statistics(
  admin_id_input TEXT
)
RETURNS TABLE (
  total_recordings BIGINT,
  total_students BIGINT,
  total_points_awarded BIGINT,
  completed_collections BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id::text = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_recordings,
    COUNT(DISTINCT pr.student_id)::BIGINT AS total_students,
    COALESCE(SUM(pr.points_awarded), 0)::BIGINT AS total_points_awarded,
    (SELECT COUNT(*)::BIGINT FROM poetry_completion_bonus) AS completed_collections
  FROM poetry_recordings pr;
END;
$$;