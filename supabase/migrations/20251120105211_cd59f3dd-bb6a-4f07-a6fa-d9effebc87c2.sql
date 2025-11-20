-- Add foreign key relationship between career_counseling and students tables

-- First, ensure that all student_id values in career_counseling exist in students
-- This will fail if there are orphaned records (좋은 것 - 데이터 무결성 문제를 발견할 수 있음)

-- Add foreign key constraint
ALTER TABLE public.career_counseling
ADD CONSTRAINT career_counseling_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES public.students(student_id) 
ON DELETE CASCADE;

-- Add index on student_id for better join performance
CREATE INDEX IF NOT EXISTS idx_career_counseling_student_id 
ON public.career_counseling(student_id);

-- Add index on counseling_date for sorting performance
CREATE INDEX IF NOT EXISTS idx_career_counseling_date 
ON public.career_counseling(counseling_date DESC);

-- Add comment for documentation
COMMENT ON CONSTRAINT career_counseling_student_id_fkey ON public.career_counseling IS 
'Foreign key relationship to ensure data integrity between counseling records and students. 
ON DELETE CASCADE ensures that when a student is deleted, their counseling records are also removed.';