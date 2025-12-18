
-- Drop existing function and recreate with cascade delete
CREATE OR REPLACE FUNCTION public.admin_delete_storybook(admin_id_input uuid, book_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Invalid admin';
  END IF;
  
  -- Set admin session for RLS policies
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);
  
  -- Delete related records first (cascade manually)
  DELETE FROM storybook_page_bookmarks WHERE book_id = book_id_input;
  DELETE FROM storybook_reviews WHERE book_id = book_id_input;
  DELETE FROM storybook_reading_history WHERE book_id = book_id_input;
  DELETE FROM storybook_pages WHERE book_id = book_id_input;
  
  -- Delete the storybook
  DELETE FROM storybooks WHERE id = book_id_input;
  
  RETURN true;
END;
$$;
