-- Create teacher_groups table for saving teacher groups
CREATE TABLE IF NOT EXISTS public.teacher_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  group_name TEXT NOT NULL,
  teacher_ids TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.teacher_groups ENABLE ROW LEVEL SECURITY;

-- Allow admins to view their own groups
CREATE POLICY "Admins can view own teacher groups"
ON public.teacher_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_admin_id', true)
);

-- Allow teachers to view their own groups
CREATE POLICY "Teachers can view own teacher groups"
ON public.teacher_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_teacher_id', true)
);

-- Allow admins to insert groups
CREATE POLICY "Admins can insert teacher groups"
ON public.teacher_groups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id = teacher_groups.admin_id
  )
);

-- Allow teachers to insert groups
CREATE POLICY "Teachers can insert teacher groups"
ON public.teacher_groups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id = teacher_groups.admin_id
  )
);

-- Allow admins to update their own groups
CREATE POLICY "Admins can update own teacher groups"
ON public.teacher_groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_admin_id', true)
);

-- Allow teachers to update their own groups
CREATE POLICY "Teachers can update own teacher groups"
ON public.teacher_groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_teacher_id', true)
);

-- Allow admins to delete their own groups
CREATE POLICY "Admins can delete own teacher groups"
ON public.teacher_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE (admins.id)::text = current_setting('app.current_admin_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_admin_id', true)
);

-- Allow teachers to delete their own groups
CREATE POLICY "Teachers can delete own teacher groups"
ON public.teacher_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE (teachers.id)::text = current_setting('app.current_teacher_id', true)
  )
  AND (admin_id)::text = current_setting('app.current_teacher_id', true)
);

-- Create index for faster queries
CREATE INDEX idx_teacher_groups_admin_id ON public.teacher_groups(admin_id);