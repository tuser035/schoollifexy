-- Drop all versions of admin_get_poetry_statistics to fix overloading issue
DROP FUNCTION IF EXISTS admin_get_poetry_statistics(text);
DROP FUNCTION IF EXISTS admin_get_poetry_statistics(uuid);

-- Recreate with uuid type only
CREATE OR REPLACE FUNCTION admin_get_poetry_statistics(
  admin_id_input uuid
)
RETURNS TABLE (
  total_recordings bigint,
  total_students bigint,
  total_points_awarded bigint,
  completed_collections bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin OR teacher with admin privileges
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM teachers WHERE teachers.id = admin_id_input AND teachers.is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin not found';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_recordings,
    COUNT(DISTINCT pr.student_id)::bigint AS total_students,
    COALESCE(SUM(pr.points_awarded), 0)::bigint AS total_points_awarded,
    (SELECT COUNT(*)::bigint FROM poetry_completion_bonus) AS completed_collections
  FROM poetry_recordings pr;
END;
$$;