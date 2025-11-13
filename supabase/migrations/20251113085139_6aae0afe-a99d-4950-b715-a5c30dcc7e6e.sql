-- Drop existing policies for demerits insert
DROP POLICY IF EXISTS "Teachers can insert demerits" ON public.demerits;
DROP POLICY IF EXISTS "Admins can insert demerits" ON public.demerits;

-- Create updated policy for teachers to insert demerits
CREATE POLICY "Teachers can insert demerits"
ON public.demerits
FOR INSERT
WITH CHECK (
  teacher_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.teachers WHERE id = demerits.teacher_id)
);

-- Admins can insert demerits
CREATE POLICY "Admins can insert demerits"
ON public.demerits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (id)::text = current_setting('app.current_admin_id', true)
  )
);