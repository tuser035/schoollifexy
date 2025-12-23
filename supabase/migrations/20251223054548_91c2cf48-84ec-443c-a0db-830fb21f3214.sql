-- book_reports 테이블에 AI 검증 사유 컬럼 추가
ALTER TABLE public.book_reports 
ADD COLUMN IF NOT EXISTS verification_reason TEXT,
ADD COLUMN IF NOT EXISTS verification_score INTEGER;

-- student_submit_book_report 함수 수정 (검증 사유 저장 추가)
CREATE OR REPLACE FUNCTION public.student_submit_book_report(
  student_id_input TEXT,
  book_title_input TEXT,
  content_input TEXT,
  award_points_input BOOLEAN DEFAULT TRUE,
  verification_reason_input TEXT DEFAULT NULL,
  verification_score_input INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER := 0;
  v_status TEXT := 'pending';
BEGIN
  -- 200자 이상이고 포인트 지급 승인된 경우에만 포인트 지급
  IF LENGTH(content_input) >= 200 AND award_points_input = TRUE THEN
    v_points := 10;
    v_status := 'approved';
  ELSIF LENGTH(content_input) >= 200 AND award_points_input = FALSE THEN
    -- AI 검증 실패: 저장은 하되 포인트 미지급
    v_points := 0;
    v_status := 'pending';
  END IF;

  -- 독후감 삽입 (검증 사유 포함)
  INSERT INTO book_reports (
    student_id, 
    book_title, 
    content, 
    points_awarded, 
    status, 
    points_awarded_at,
    verification_reason,
    verification_score
  )
  VALUES (
    student_id_input, 
    book_title_input, 
    content_input, 
    v_points,
    v_status,
    CASE WHEN v_points > 0 THEN now() ELSE NULL END,
    verification_reason_input,
    verification_score_input
  );
  
  RETURN TRUE;
END;
$$;