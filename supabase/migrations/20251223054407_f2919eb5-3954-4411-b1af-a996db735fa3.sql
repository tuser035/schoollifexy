-- 기존 student_submit_book_report 함수를 수정하여 award_points_input 파라미터 추가
CREATE OR REPLACE FUNCTION public.student_submit_book_report(
  student_id_input TEXT,
  book_title_input TEXT,
  content_input TEXT,
  award_points_input BOOLEAN DEFAULT TRUE
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

  -- 독후감 삽입
  INSERT INTO book_reports (student_id, book_title, content, points_awarded, status, points_awarded_at)
  VALUES (
    student_id_input, 
    book_title_input, 
    content_input, 
    v_points,
    v_status,
    CASE WHEN v_points > 0 THEN now() ELSE NULL END
  );
  
  RETURN TRUE;
END;
$$;