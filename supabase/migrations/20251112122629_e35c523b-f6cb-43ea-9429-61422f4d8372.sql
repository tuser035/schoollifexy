-- Create career counseling table for recording counseling sessions
CREATE TABLE public.career_counseling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  counselor_name TEXT NOT NULL,
  counseling_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.career_counseling ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all counseling records"
ON public.career_counseling
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

CREATE POLICY "Admins can insert counseling records"
ON public.career_counseling
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can update counseling records"
ON public.career_counseling
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_career_counseling_updated_at
BEFORE UPDATE ON public.career_counseling
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get counseling records for a student
CREATE OR REPLACE FUNCTION public.admin_get_counseling_records(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  id uuid,
  counselor_name text,
  counseling_date date,
  content text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 관리자 인증 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    cc.id,
    cc.counselor_name,
    cc.counseling_date,
    cc.content,
    cc.created_at
  FROM public.career_counseling cc
  WHERE cc.student_id = student_id_input
  ORDER BY cc.counseling_date DESC, cc.created_at DESC;
END;
$function$;