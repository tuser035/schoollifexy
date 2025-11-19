-- Fix RLS policy for SECURITY DEFINER functions
-- The issue is that RLS policies are still evaluated even in SECURITY DEFINER functions
-- We need to allow inserts when teacher_id matches the session or when called from SECURITY DEFINER

DROP POLICY IF EXISTS "Teachers can insert demerits" ON public.demerits;

-- Create a simpler policy that allows the SECURITY DEFINER function to work
CREATE POLICY "Teachers can insert demerits"
ON public.demerits FOR INSERT
WITH CHECK (
  teacher_id IS NOT NULL AND (
    (teacher_id)::text = current_setting('app.current_teacher_id', true)
    OR current_setting('app.current_admin_id', true) IS NOT NULL
  )
);

-- Do the same for merits to prevent similar issues
DROP POLICY IF EXISTS "Teachers can insert merits" ON public.merits;

CREATE POLICY "Teachers can insert merits"
ON public.merits FOR INSERT
WITH CHECK (
  teacher_id IS NOT NULL AND (
    (teacher_id)::text = current_setting('app.current_teacher_id', true)
    OR current_setting('app.current_admin_id', true) IS NOT NULL
  )
);