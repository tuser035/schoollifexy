-- student_get_current_recommended_books 함수를 학기 기준으로 수정 (1학기: 3-8월, 2학기: 9-2월)
CREATE OR REPLACE FUNCTION public.student_get_current_recommended_books(student_id_input text)
RETURNS TABLE(
  id uuid,
  title text,
  author text,
  description text,
  display_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month integer;
  current_semester integer;
  current_year integer;
BEGIN
  -- 세션 설정
  PERFORM set_student_session(student_id_input);
  
  -- 학생 확인
  IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = student_id_input) THEN
    RAISE EXCEPTION '학생을 찾을 수 없습니다';
  END IF;
  
  current_month := EXTRACT(MONTH FROM NOW());
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- 학기 계산: 3-8월 = 1학기, 9-2월 = 2학기
  IF current_month >= 3 AND current_month <= 8 THEN
    current_semester := 1;
  ELSE
    current_semester := 2;
    -- 1-2월은 전년도 2학기
    IF current_month <= 2 THEN
      current_year := current_year - 1;
    END IF;
  END IF;
  
  RETURN QUERY
  SELECT 
    rb.id,
    rb.title,
    rb.author,
    rb.description,
    rb.display_order
  FROM recommended_books rb
  WHERE rb.year = current_year
    AND rb.quarter = current_semester
    AND rb.is_active = true
  ORDER BY rb.display_order ASC, rb.title ASC;
END;
$$;