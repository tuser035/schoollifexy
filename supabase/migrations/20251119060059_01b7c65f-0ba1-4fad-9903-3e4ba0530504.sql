-- Check current RLS policies for career_counseling
SELECT * FROM pg_policies WHERE tablename = 'career_counseling' AND cmd = 'INSERT';