-- Add category field to monthly table for tracking recommendation type
ALTER TABLE public.monthly 
ADD COLUMN category text;

-- Add a check constraint to ensure valid categories
ALTER TABLE public.monthly
ADD CONSTRAINT monthly_category_check 
CHECK (category IN ('봉사', '선행', '효행'));