-- Add category column to storybooks table
ALTER TABLE public.storybooks 
ADD COLUMN category TEXT DEFAULT 'recommended';

-- Add comment for clarity
COMMENT ON COLUMN public.storybooks.category IS '카테고리: philosophy(철학), poetry(시집), recommended(추천도서)';

-- Create index for better query performance
CREATE INDEX idx_storybooks_category ON public.storybooks(category);