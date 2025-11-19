-- Simplify RLS policies for SECURITY DEFINER functions
-- The functions already handle security via set_config, so we can simplify the policies

-- Drop the complex RPC policy and replace with simpler one
DROP POLICY IF EXISTS "Teachers can insert merits via RPC" ON public.merits;

-- Create simpler policy that trusts the SECURITY DEFINER function
CREATE POLICY "Teachers can insert merits"
ON public.merits FOR INSERT
WITH CHECK (
  teacher_id IS NOT NULL AND (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    OR current_setting('app.current_admin_id', true) IS NOT NULL
  )
);

-- Do the same for demerits
DROP POLICY IF EXISTS "Teachers can insert demerits via RPC" ON public.demerits;

CREATE POLICY "Teachers can insert demerits"
ON public.demerits FOR INSERT
WITH CHECK (
  teacher_id IS NOT NULL AND (
    current_setting('app.current_teacher_id', true) IS NOT NULL
    OR current_setting('app.current_admin_id', true) IS NOT NULL
  )
);