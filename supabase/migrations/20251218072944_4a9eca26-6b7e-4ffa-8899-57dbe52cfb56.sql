-- Create RPC function to update storybook page count
CREATE OR REPLACE FUNCTION public.admin_update_storybook_page_count(
  admin_id_input UUID,
  book_id_input UUID,
  page_count_input INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update page count
  UPDATE storybooks 
  SET page_count = page_count_input, updated_at = now()
  WHERE id = book_id_input;

  RETURN TRUE;
END;
$$;