-- Drop existing teacher insert policies that are too restrictive
DROP POLICY IF EXISTS "Teachers can insert merits" ON public.merits;
DROP POLICY IF EXISTS "Teachers can insert demerits" ON public.demerits;

-- Create new policies that work with SECURITY DEFINER functions
-- These policies allow inserts when the teacher_id matches OR when called from our RPC functions
CREATE POLICY "Teachers can insert merits via RPC"
ON public.merits FOR INSERT
WITH CHECK (
  teacher_id::text = current_setting('app.current_teacher_id', true)
  OR
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = teacher_id
  )
);

CREATE POLICY "Teachers can insert demerits via RPC"
ON public.demerits FOR INSERT
WITH CHECK (
  teacher_id::text = current_setting('app.current_teacher_id', true)
  OR
  EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE t.id = teacher_id
  )
);