-- Create RPC function to get audit logs
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_admin_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  created_at timestamp with time zone,
  user_id text,
  user_type text,
  action_type text,
  table_name text,
  record_id text,
  status text,
  error_message text,
  ip_address text,
  user_agent text,
  old_data jsonb,
  new_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that the caller is an admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = p_admin_id) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Return audit logs
  RETURN QUERY
  SELECT 
    al.id,
    al.created_at,
    al.user_id,
    al.user_type,
    al.action_type,
    al.table_name,
    al.record_id,
    al.status,
    al.error_message,
    al.ip_address,
    al.user_agent,
    al.old_data,
    al.new_data
  FROM public.audit_logs al
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Create RPC function to delete old audit logs (optional, for maintenance)
CREATE OR REPLACE FUNCTION public.delete_old_audit_logs(
  p_admin_id uuid,
  p_days_old integer DEFAULT 90
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Verify that the caller is an admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = p_admin_id) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Delete logs older than specified days
  DELETE FROM public.audit_logs
  WHERE created_at < (now() - (p_days_old || ' days')::interval);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;