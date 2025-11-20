-- Drop and recreate admin_get_storage_files with original_filename
DROP FUNCTION IF EXISTS public.admin_get_storage_files(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_get_storage_files(
  admin_id_input uuid,
  bucket_name_input text
)
RETURNS TABLE (
  id uuid,
  name text,
  bucket_id text,
  created_at timestamptz,
  updated_at timestamptz,
  last_accessed_at timestamptz,
  metadata jsonb,
  owner text,
  original_filename text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Return storage objects with original filenames from file_metadata
  RETURN QUERY
  SELECT 
    so.id,
    so.name,
    so.bucket_id,
    so.created_at,
    so.updated_at,
    so.last_accessed_at,
    so.metadata,
    so.owner,
    fm.original_filename
  FROM storage.objects so
  LEFT JOIN public.file_metadata fm ON fm.storage_path = so.name AND fm.bucket_name = so.bucket_id
  WHERE so.bucket_id = bucket_name_input
  ORDER BY so.created_at DESC;
END;
$$;