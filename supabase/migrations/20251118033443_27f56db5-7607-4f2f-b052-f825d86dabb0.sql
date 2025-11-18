-- Create file_metadata table to track original file names
CREATE TABLE IF NOT EXISTS public.file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  bucket_name TEXT NOT NULL DEFAULT 'evidence-photos',
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_metadata ENABLE ROW LEVEL SECURITY;

-- Admins can view all file metadata
CREATE POLICY "Admins can view all file metadata"
ON public.file_metadata
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Admins can insert file metadata
CREATE POLICY "Admins can insert file metadata"
ON public.file_metadata
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Teachers can insert file metadata
CREATE POLICY "Teachers can insert file metadata"
ON public.file_metadata
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
  )
);

-- Admins can delete file metadata
CREATE POLICY "Admins can delete file metadata"
ON public.file_metadata
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);

-- Create index for faster lookups
CREATE INDEX idx_file_metadata_storage_path ON public.file_metadata(storage_path);
CREATE INDEX idx_file_metadata_bucket_name ON public.file_metadata(bucket_name);