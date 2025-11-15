-- Allow teachers to delete their own merits
CREATE POLICY "Teachers can delete own merits"
ON public.merits
FOR DELETE
USING (
  teacher_id IS NOT NULL 
  AND (teacher_id)::text = current_setting('app.current_teacher_id'::text, true)
);

-- Allow teachers to delete their own demerits
CREATE POLICY "Teachers can delete own demerits"
ON public.demerits
FOR DELETE
USING (
  teacher_id IS NOT NULL 
  AND (teacher_id)::text = current_setting('app.current_teacher_id'::text, true)
);

-- Allow teachers to delete their own monthly recommendations
CREATE POLICY "Teachers can delete own monthly"
ON public.monthly
FOR DELETE
USING (
  teacher_id IS NOT NULL 
  AND (teacher_id)::text = current_setting('app.current_teacher_id'::text, true)
);