-- Update RPC function for file metadata to handle duplicates with upsert
CREATE OR REPLACE FUNCTION public.admin_insert_file_metadata(
  admin_id_input uuid,
  bucket_name_input text,
  storage_path_input text,
  original_filename_input text,
  mime_type_input text DEFAULT NULL,
  file_size_input bigint DEFAULT NULL,
  uploaded_by_input uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_metadata_id uuid;
BEGIN
  -- Verify admin or teacher exists
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) 
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- Set session
  PERFORM set_config('app.current_admin_id', admin_id_input::text, true);

  -- Insert or update file metadata (upsert on conflict with storage_path)
  INSERT INTO public.file_metadata (
    bucket_name, storage_path, original_filename, mime_type, file_size, uploaded_by
  )
  VALUES (
    bucket_name_input, storage_path_input, original_filename_input,
    mime_type_input, file_size_input, uploaded_by_input
  )
  ON CONFLICT (storage_path) DO UPDATE 
  SET 
    bucket_name = EXCLUDED.bucket_name,
    original_filename = EXCLUDED.original_filename,
    mime_type = EXCLUDED.mime_type,
    file_size = EXCLUDED.file_size,
    uploaded_by = EXCLUDED.uploaded_by,
    uploaded_at = now()
  RETURNING id INTO new_metadata_id;

  RETURN new_metadata_id;
END;
$$;