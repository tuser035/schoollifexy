-- 기존 함수 삭제 후 타입 수정하여 재생성
DROP FUNCTION IF EXISTS get_student_nationality_codes(TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION get_student_nationality_codes(
  user_id_input TEXT,
  student_ids_input TEXT[]
)
RETURNS TABLE (
  student_id TEXT,
  nationality_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 관리자 또는 교사 권한 확인 (UUID 캐스팅)
  IF NOT (
    EXISTS (SELECT 1 FROM admins WHERE id::text = user_id_input) OR
    EXISTS (SELECT 1 FROM teachers WHERE id::text = user_id_input)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT s.student_id, s.nationality_code
  FROM students s
  WHERE s.student_id = ANY(student_ids_input);
END;
$$;