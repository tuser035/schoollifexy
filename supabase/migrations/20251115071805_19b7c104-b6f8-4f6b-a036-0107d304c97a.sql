-- Add department and subject columns to teachers table
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.teachers.department IS '행정 부서 (예: 교무부, 연구부, 학생부)';
COMMENT ON COLUMN public.teachers.subject IS '담당 교과 (예: 국어, 수학, 영어)';