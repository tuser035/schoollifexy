-- Drop homeroom table
DROP TABLE IF EXISTS public.homeroom CASCADE;

-- Drop existing admin_get_homeroom function
DROP FUNCTION IF EXISTS public.admin_get_homeroom(uuid, integer, integer);

-- Create new admin_get_homeroom function that queries teachers table instead
CREATE OR REPLACE FUNCTION public.admin_get_homeroom(
  admin_id_input uuid, 
  search_grade integer DEFAULT NULL, 
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  year integer,
  grade integer, 
  class integer, 
  teacher_name text
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

  -- teachers 테이블에서 담임교사(is_homeroom=true) 조회
  RETURN QUERY
  SELECT 
    EXTRACT(YEAR FROM now())::integer as year,
    t.grade,
    t.class,
    COALESCE(t.name, '-') as teacher_name
  FROM public.teachers t
  WHERE 
    t.is_homeroom = true
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
  ORDER BY t.grade, t.class
  LIMIT 50;
END;
$$;