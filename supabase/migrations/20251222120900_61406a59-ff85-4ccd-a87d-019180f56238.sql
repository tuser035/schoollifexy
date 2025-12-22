-- Drop all versions of admin_get_poetry_recordings to fix overloading issue
DROP FUNCTION IF EXISTS admin_get_poetry_recordings(text, uuid, text);
DROP FUNCTION IF EXISTS admin_get_poetry_recordings(uuid, uuid, text);

-- Recreate with uuid type only
CREATE OR REPLACE FUNCTION admin_get_poetry_recordings(
  admin_id_input uuid,
  collection_id_input uuid DEFAULT NULL,
  student_id_input text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  student_id text,
  student_name text,
  student_grade integer,
  student_class integer,
  student_number integer,
  collection_id uuid,
  collection_title text,
  poem_id uuid,
  poem_title text,
  recording_url text,
  duration_seconds integer,
  points_awarded integer,
  created_at timestamptz
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
    pr.id,
    pr.student_id,
    s.name AS student_name,
    s.grade AS student_grade,
    s.class AS student_class,
    s.number AS student_number,
    pr.collection_id,
    pc.title AS collection_title,
    pr.poem_id,
    p.title AS poem_title,
    pr.recording_url,
    pr.duration_seconds,
    pr.points_awarded,
    pr.created_at
  FROM poetry_recordings pr
  JOIN students s ON s.student_id = pr.student_id
  JOIN poetry_collections pc ON pc.id = pr.collection_id
  JOIN poems p ON p.id = pr.poem_id
  WHERE 
    (collection_id_input IS NULL OR pr.collection_id = collection_id_input)
    AND (student_id_input IS NULL OR pr.student_id = student_id_input)
  ORDER BY pr.created_at DESC;
END;
$$;