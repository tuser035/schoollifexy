-- Function to update storybook title
CREATE OR REPLACE FUNCTION public.admin_update_storybook_title(
  admin_id_input uuid,
  book_id_input uuid,
  title_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Admin not found';
  END IF;
  
  -- Update the storybook title
  UPDATE storybooks
  SET title = title_input,
      updated_at = now()
  WHERE id = book_id_input;
  
  RETURN true;
END;
$$;