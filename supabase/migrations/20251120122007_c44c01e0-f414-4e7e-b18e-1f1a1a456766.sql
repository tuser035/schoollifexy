-- Drop the problematic policy
DROP POLICY IF EXISTS "Teachers can insert monthly recommendations" ON public.monthly;

-- Recreate the policy using the security definer function
CREATE POLICY "Teachers can insert monthly recommendations" 
ON public.monthly 
FOR INSERT 
WITH CHECK (
  (teacher_id IS NOT NULL) 
  AND (
    ((teacher_id)::text = current_setting('app.current_teacher_id'::text, true)) 
    OR public.is_admin_user(current_setting('app.current_admin_id'::text, true)::uuid)
  )
);