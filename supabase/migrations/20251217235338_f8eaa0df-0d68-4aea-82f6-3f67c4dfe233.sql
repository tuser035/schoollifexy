-- Create RPC function to update storybook description
CREATE OR REPLACE FUNCTION public.admin_update_storybook_description(
  admin_id_input UUID,
  book_id_input UUID,
  description_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM admins WHERE id = admin_id_input
  ) AND NOT EXISTS (
    SELECT 1 FROM teachers WHERE id = admin_id_input AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Set admin session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Update storybook description
  UPDATE storybooks
  SET description = description_input,
      updated_at = now()
  WHERE id = book_id_input;

  RETURN TRUE;
END;
$$;