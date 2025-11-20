-- Drop existing function
DROP FUNCTION IF EXISTS public.get_audit_logs(uuid, integer);

-- Recreate function with user_name field
CREATE OR REPLACE FUNCTION public.get_audit_logs(p_admin_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid, 
  created_at timestamp with time zone, 
  user_id text,
  user_name text,
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
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify that the caller is an admin
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = p_admin_id) THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;

  -- Return audit logs with user names
  RETURN QUERY
  SELECT 
    al.id,
    al.created_at,
    al.user_id,
    CASE 
      WHEN al.user_type = 'admin' THEN 
        COALESCE((SELECT name FROM public.admins WHERE (id::text = al.user_id) OR (call_a = al.user_id)), al.user_id)
      WHEN al.user_type = 'teacher' THEN 
        COALESCE((SELECT name FROM public.teachers WHERE (id::text = al.user_id) OR (call_t = al.user_id)), al.user_id)
      WHEN al.user_type = 'student' THEN 
        COALESCE((SELECT name FROM public.students WHERE student_id = al.user_id), al.user_id)
      ELSE al.user_id
    END as user_name,
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