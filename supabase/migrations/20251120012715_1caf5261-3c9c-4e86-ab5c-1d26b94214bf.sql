-- Storage 파일 목록을 조회하는 관리자용 함수
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
  owner uuid,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- storage.objects에서 파일 목록 조회
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.bucket_id,
    o.created_at,
    o.updated_at,
    o.last_accessed_at,
    o.owner,
    o.metadata
  FROM storage.objects o
  WHERE o.bucket_id = bucket_name_input
  ORDER BY o.created_at DESC;
END;
$$;