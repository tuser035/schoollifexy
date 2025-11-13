-- Create or replace a robust leaderboard RPC that aggregates points server-side
CREATE OR REPLACE FUNCTION public.admin_get_leaderboard(
  admin_id_input uuid,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL,
  year_input integer DEFAULT NULL
)
RETURNS TABLE(
  student_id text,
  name text,
  grade integer,
  class integer,
  number integer,
  merits integer,
  demerits integer,
  total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 관리자 인증 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  -- 서버측 집계: student_id 포맷/공백 차이를 흡수하기 위해 TRIM 사용
  RETURN QUERY
  WITH s AS (
    SELECT st.student_id, st.name, st.grade, st.class, st.number
    FROM public.students st
    WHERE (search_grade IS NULL OR st.grade = search_grade)
      AND (search_class IS NULL OR st.class = search_class)
  ),
  m AS (
    SELECT trim(me.student_id) AS student_id, COALESCE(SUM(me.score), 0)::integer AS merits
    FROM public.merits me
    WHERE (year_input IS NULL OR EXTRACT(YEAR FROM me.created_at) = year_input)
    GROUP BY trim(me.student_id)
  ),
  d AS (
    SELECT trim(de.student_id) AS student_id, COALESCE(SUM(de.score), 0)::integer AS demerits
    FROM public.demerits de
    WHERE (year_input IS NULL OR EXTRACT(YEAR FROM de.created_at) = year_input)
    GROUP BY trim(de.student_id)
  )
  SELECT 
    s.student_id,
    s.name,
    s.grade,
    s.class,
    s.number,
    COALESCE(m.merits, 0)::integer AS merits,
    COALESCE(d.demerits, 0)::integer AS demerits,
    (COALESCE(m.merits, 0) - COALESCE(d.demerits, 0))::integer AS total
  FROM s
  LEFT JOIN m ON m.student_id = s.student_id
  LEFT JOIN d ON d.student_id = s.student_id
  ORDER BY total DESC, merits DESC, name ASC;
END;
$$;