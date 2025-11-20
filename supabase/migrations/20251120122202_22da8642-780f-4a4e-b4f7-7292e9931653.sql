-- Create RPC function for inserting teacher groups
CREATE OR REPLACE FUNCTION public.admin_insert_teacher_group(
  admin_id_input uuid,
  group_name_input text,
  teacher_ids_input text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group_id uuid;
BEGIN
  -- Verify admin or teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert teacher group
  INSERT INTO public.teacher_groups (admin_id, group_name, teacher_ids)
  VALUES (admin_id_input, group_name_input, teacher_ids_input)
  RETURNING id INTO new_group_id;

  RETURN new_group_id;
END;
$$;