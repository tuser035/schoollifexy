-- Add subtitle column to storybooks table
ALTER TABLE public.storybooks ADD COLUMN subtitle text;

-- Create function to update storybook subtitle
CREATE OR REPLACE FUNCTION public.admin_update_storybook_subtitle(
  admin_id_input uuid,
  book_id_input uuid,
  subtitle_input text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin exists
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid admin';
  END IF;
  
  -- Update subtitle
  UPDATE storybooks
  SET subtitle = subtitle_input, updated_at = now()
  WHERE id = book_id_input;
  
  RETURN FOUND;
END;
$$;