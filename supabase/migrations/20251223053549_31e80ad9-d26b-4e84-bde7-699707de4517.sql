-- 독후감 삭제 함수 (학생용) - 포인트 차감 포함
CREATE OR REPLACE FUNCTION public.student_delete_book_report(
  student_id_input TEXT,
  report_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
BEGIN
  -- 독후감 조회 및 소유권 확인
  SELECT id, student_id, points_awarded, status
  INTO v_report
  FROM book_reports
  WHERE id = report_id_input AND student_id = student_id_input;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '독후감을 찾을 수 없거나 삭제 권한이 없습니다';
  END IF;
  
  -- 독후감 삭제
  DELETE FROM book_reports WHERE id = report_id_input;
  
  RETURN TRUE;
END;
$$;

-- 독후감 수정 함수 (학생용)
CREATE OR REPLACE FUNCTION public.student_update_book_report(
  student_id_input TEXT,
  report_id_input UUID,
  content_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report RECORD;
BEGIN
  -- 독후감 조회 및 소유권 확인
  SELECT id, student_id, status
  INTO v_report
  FROM book_reports
  WHERE id = report_id_input AND student_id = student_id_input;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '독후감을 찾을 수 없거나 수정 권한이 없습니다';
  END IF;
  
  -- 독후감 수정
  UPDATE book_reports
  SET content = content_input, updated_at = now()
  WHERE id = report_id_input;
  
  RETURN TRUE;
END;
$$;