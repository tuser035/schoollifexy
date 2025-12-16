-- email_history 테이블에 첨부파일 정보 컬럼 추가
ALTER TABLE public.email_history 
ADD COLUMN attachment_urls text[] DEFAULT NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.email_history.attachment_urls IS '첨부파일 URL 배열';