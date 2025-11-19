-- anon role에게 teachers 테이블 SELECT 권한 부여
GRANT SELECT ON public.teachers TO anon;
GRANT SELECT ON public.teachers TO authenticated;