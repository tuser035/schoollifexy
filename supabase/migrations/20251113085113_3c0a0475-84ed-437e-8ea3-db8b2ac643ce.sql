-- Drop existing policies for merits insert
DROP POLICY IF EXISTS "Teachers can insert merits" ON public.merits;
DROP POLICY IF EXISTS "Admins can insert merits" ON public.merits;

-- Create updated policy for teachers to insert merits
-- Teachers can insert merits as long as they provide a valid teacher_id
CREATE POLICY "Teachers can insert merits"
ON public.merits
FOR INSERT
WITH CHECK (
  teacher_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.teachers WHERE id = merits.teacher_id)
);

-- Admins can insert merits
CREATE POLICY "Admins can insert merits"
ON public.merits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (id)::text = current_setting('app.current_admin_id', true)
  )
);