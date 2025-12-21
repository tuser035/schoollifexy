-- Create RPC function to update storybook category
CREATE OR REPLACE FUNCTION public.admin_update_storybook_category(
  admin_id_input text,
  book_id_input uuid,
  category_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set admin session for RLS
  PERFORM set_admin_session(admin_id_input::uuid);
  
  -- Update the category
  UPDATE storybooks
  SET category = category_input, updated_at = now()
  WHERE id = book_id_input;
  
  RETURN FOUND;
END;
$$;