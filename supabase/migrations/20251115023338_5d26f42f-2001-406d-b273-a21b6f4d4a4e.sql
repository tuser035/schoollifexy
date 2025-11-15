-- Create email_history table for tracking email sends
CREATE TABLE public.email_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'teacher')),
  sender_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_student_id TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all email history
CREATE POLICY "Admins can view all email history"
  ON public.email_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id::text = current_setting('app.current_admin_id', true)
    )
  );

-- Teachers can view their own email history
CREATE POLICY "Teachers can view own email history"
  ON public.email_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE id::text = current_setting('app.current_teacher_id', true)
    )
    AND sender_id::text = current_setting('app.current_teacher_id', true)
  );

-- Admins can insert email history
CREATE POLICY "Admins can insert email history"
  ON public.email_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE id::text = current_setting('app.current_admin_id', true)
    )
  );

-- Teachers can insert their own email history
CREATE POLICY "Teachers can insert email history"
  ON public.email_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE id::text = current_setting('app.current_teacher_id', true)
    )
    AND sender_id::text = current_setting('app.current_teacher_id', true)
  );

-- Create function to get email history
CREATE OR REPLACE FUNCTION public.admin_get_email_history(
  admin_id_input UUID,
  search_text TEXT DEFAULT NULL,
  search_grade INTEGER DEFAULT NULL,
  search_class INTEGER DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  sender_name TEXT,
  sender_type TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    eh.id,
    eh.sender_name,
    eh.sender_type,
    eh.recipient_email,
    eh.recipient_name,
    eh.subject,
    eh.body,
    eh.sent_at
  FROM public.email_history eh
  LEFT JOIN public.students s ON s.student_id = eh.recipient_student_id
  WHERE 
    (search_text IS NULL OR 
     eh.recipient_name ILIKE '%' || search_text || '%' OR 
     eh.sender_name ILIKE '%' || search_text || '%' OR
     eh.subject ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY eh.sent_at DESC
  LIMIT 100;
END;
$$;