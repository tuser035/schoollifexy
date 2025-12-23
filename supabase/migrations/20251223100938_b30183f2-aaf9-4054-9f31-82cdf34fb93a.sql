-- Add nationality_code column to students table
ALTER TABLE public.students 
ADD COLUMN nationality_code text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.students.nationality_code IS 'ISO 3166-1 alpha-2 국적 코드 (예: KR, US, JP, CN)';