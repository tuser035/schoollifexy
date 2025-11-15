-- Create student_groups table for saving frequently used student groups
CREATE TABLE IF NOT EXISTS public.student_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  group_name TEXT NOT NULL,
  student_ids TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;

-- Allow admins to view their own groups
CREATE POLICY "Admins can view own groups"
ON public.student_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_admin_id', true)
);

-- Allow teachers to view their own groups
CREATE POLICY "Teachers can view own groups"
ON public.student_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_teacher_id', true)
);

-- Allow admins to insert groups
CREATE POLICY "Admins can insert groups"
ON public.student_groups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id = student_groups.admin_id
  )
);

-- Allow teachers to insert groups
CREATE POLICY "Teachers can insert groups"
ON public.student_groups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id = student_groups.admin_id
  )
);

-- Allow admins to update their own groups
CREATE POLICY "Admins can update own groups"
ON public.student_groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_admin_id', true)
);

-- Allow teachers to update their own groups
CREATE POLICY "Teachers can update own groups"
ON public.student_groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_teacher_id', true)
);

-- Allow admins to delete their own groups
CREATE POLICY "Admins can delete own groups"
ON public.student_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_admin_id', true)
);

-- Allow teachers to delete their own groups
CREATE POLICY "Teachers can delete own groups"
ON public.student_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_teacher_id', true)
);

-- Create index for faster queries
CREATE INDEX idx_student_groups_admin_id ON public.student_groups(admin_id);