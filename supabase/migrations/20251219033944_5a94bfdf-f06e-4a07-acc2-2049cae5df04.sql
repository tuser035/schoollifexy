-- Function to update storybook book number
CREATE OR REPLACE FUNCTION public.admin_update_storybook_book_number(
  admin_id_input uuid,
  book_id_input uuid,
  book_number_input integer
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
  
  -- Update the storybook book number
  UPDATE storybooks
  SET book_number = book_number_input,
      updated_at = now()
  WHERE id = book_id_input;
  
  RETURN true;
END;
$$;