-- Drop the old restrictive delete policy for student_groups
DROP POLICY IF EXISTS "Admins can delete own student groups" ON public.student_groups;

-- Create new policy allowing admins to delete any student group
CREATE POLICY "Admins can delete all student groups"
ON public.student_groups
FOR DELETE
USING (
  (current_setting('app.current_admin_id', true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id', true) <> '')
);

-- Also update the teacher delete policy to allow teachers to delete any group they created
DROP POLICY IF EXISTS "Teachers can delete own student groups" ON public.student_groups;

CREATE POLICY "Teachers can delete own student groups"
ON public.student_groups
FOR DELETE
USING (
  (current_setting('app.current_teacher_id', true) IS NOT NULL) 
  AND (current_setting('app.current_teacher_id', true) <> '')
  AND (admin_id::text = current_setting('app.current_teacher_id', true))
);