-- Fix ambiguous column reference in admin_get_student_points_by_class function
CREATE OR REPLACE FUNCTION public.admin_get_student_points_by_class(admin_id_input uuid, p_grade integer, p_class integer)
RETURNS TABLE(student_id text, name text, merits integer, demerits integer, monthly integer, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 관리자 인증 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  -- 반별 학생 상점/벌점 조회
  RETURN QUERY
  WITH s AS (
    SELECT st.student_id, st.name 
    FROM public.students st 
    WHERE st.grade = p_grade AND st.class = p_class
  ),
  m AS (
    SELECT me.student_id, COALESCE(SUM(me.score),0)::integer AS merits 
    FROM public.merits me
    WHERE me.student_id IN (SELECT s.student_id FROM s)
    GROUP BY me.student_id
  ),
  d AS (
    SELECT de.student_id, COALESCE(SUM(de.score),0)::integer AS demerits 
    FROM public.demerits de
    WHERE de.student_id IN (SELECT s.student_id FROM s)
    GROUP BY de.student_id
  ),
  mo AS (
    SELECT mo_inner.student_id, COUNT(*)::integer AS monthly 
    FROM public.monthly mo_inner
    WHERE mo_inner.student_id IN (SELECT s.student_id FROM s)
    GROUP BY mo_inner.student_id
  )
  SELECT 
    s.student_id, 
    s.name,
    COALESCE(m.merits,0)::integer AS merits,
    COALESCE(d.demerits,0)::integer AS demerits,
    COALESCE(mo.monthly,0)::integer AS monthly,
    (COALESCE(m.merits,0) - COALESCE(d.demerits,0))::integer AS total
  FROM s
  LEFT JOIN m ON m.student_id = s.student_id
  LEFT JOIN d ON d.student_id = s.student_id
  LEFT JOIN mo ON mo.student_id = s.student_id
  ORDER BY s.name;
END;
$function$;