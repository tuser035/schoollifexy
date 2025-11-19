-- Create RPC function for inserting merits with proper session handling
CREATE OR REPLACE FUNCTION public.insert_merit(
  p_student_id text,
  p_teacher_id uuid,
  p_category text,
  p_reason text,
  p_score integer,
  p_image_url text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_merit_id uuid;
BEGIN
  -- Set teacher session for RLS
  PERFORM set_config('app.current_teacher_id', p_teacher_id::text, true);
  
  -- Insert merit
  INSERT INTO public.merits (student_id, teacher_id, category, reason, score, image_url)
  VALUES (p_student_id, p_teacher_id, p_category, p_reason, p_score, p_image_url)
  RETURNING id INTO new_merit_id;
  
  RETURN new_merit_id;
END;
$$;

-- Create RPC function for inserting demerits with proper session handling
CREATE OR REPLACE FUNCTION public.insert_demerit(
  p_student_id text,
  p_teacher_id uuid,
  p_category text,
  p_reason text,
  p_score integer,
  p_image_url text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_demerit_id uuid;
BEGIN
  -- Set teacher session for RLS
  PERFORM set_config('app.current_teacher_id', p_teacher_id::text, true);
  
  -- Insert demerit
  INSERT INTO public.demerits (student_id, teacher_id, category, reason, score, image_url)
  VALUES (p_student_id, p_teacher_id, p_category, p_reason, p_score, p_image_url)
  RETURNING id INTO new_demerit_id;
  
  RETURN new_demerit_id;
END;
$$;