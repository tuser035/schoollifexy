-- Drop and recreate admin_get_storybooks with subtitle
DROP FUNCTION IF EXISTS public.admin_get_storybooks(uuid);

CREATE OR REPLACE FUNCTION public.admin_get_storybooks(admin_id_input uuid)
RETURNS TABLE(
  id uuid,
  book_number integer,
  title text,
  subtitle text,
  cover_image_url text,
  description text,
  page_count integer,
  is_published boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.book_number,
    s.title,
    s.subtitle,
    s.cover_image_url,
    s.description,
    s.page_count,
    s.is_published,
    s.created_at
  FROM storybooks s
  ORDER BY s.book_number;
END;
$$;

-- Drop and recreate student_get_storybooks with subtitle
DROP FUNCTION IF EXISTS public.student_get_storybooks(text);

CREATE OR REPLACE FUNCTION public.student_get_storybooks(student_id_input text)
RETURNS TABLE(
  id uuid,
  book_number integer,
  title text,
  subtitle text,
  cover_image_url text,
  description text,
  page_count integer,
  is_completed boolean,
  last_page integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = student_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid student';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.book_number,
    s.title,
    s.subtitle,
    s.cover_image_url,
    s.description,
    s.page_count,
    COALESCE(rh.is_completed, false) as is_completed,
    COALESCE(rh.last_page, 0) as last_page
  FROM storybooks s
  LEFT JOIN storybook_reading_history rh ON rh.book_id = s.id AND rh.student_id = student_id_input
  WHERE s.is_published = true
  ORDER BY s.book_number;
END;
$$;

-- Create book_reports table for 독후감
CREATE TABLE IF NOT EXISTS public.book_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id text NOT NULL,
  book_title text NOT NULL,
  content text NOT NULL,
  points_awarded integer DEFAULT 0,
  points_awarded_by uuid,
  points_awarded_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.book_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for book_reports
CREATE POLICY "Students can insert own book reports" ON public.book_reports
  FOR INSERT WITH CHECK (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can view own book reports" ON public.book_reports
  FOR SELECT USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can update own pending book reports" ON public.book_reports
  FOR UPDATE USING (
    student_id = current_setting('app.current_student_id', true) 
    AND status = 'pending'
  );

CREATE POLICY "Admins can view all book reports" ON public.book_reports
  FOR SELECT USING (
    current_setting('app.current_admin_id', true) IS NOT NULL 
    AND current_setting('app.current_admin_id', true) <> ''
  );

CREATE POLICY "Admins can update book reports" ON public.book_reports
  FOR UPDATE USING (
    current_setting('app.current_admin_id', true) IS NOT NULL 
    AND current_setting('app.current_admin_id', true) <> ''
  );

CREATE POLICY "Teachers can view all book reports" ON public.book_reports
  FOR SELECT USING (
    current_setting('app.current_teacher_id', true) IS NOT NULL 
    AND current_setting('app.current_teacher_id', true) <> ''
  );

-- Function for student to submit book report
CREATE OR REPLACE FUNCTION public.student_submit_book_report(
  student_id_input text,
  book_title_input text,
  content_input text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = student_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid student';
  END IF;

  -- Check if already submitted for this book
  IF EXISTS (SELECT 1 FROM book_reports WHERE student_id = student_id_input AND book_title = book_title_input) THEN
    RAISE EXCEPTION 'Already submitted a report for this book';
  END IF;

  INSERT INTO book_reports (student_id, book_title, content)
  VALUES (student_id_input, book_title_input, content_input)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Function for student to get their book reports
CREATE OR REPLACE FUNCTION public.student_get_book_reports(student_id_input text)
RETURNS TABLE(
  id uuid,
  book_title text,
  content text,
  points_awarded integer,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = student_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid student';
  END IF;

  RETURN QUERY
  SELECT 
    br.id,
    br.book_title,
    br.content,
    br.points_awarded,
    br.status,
    br.created_at
  FROM book_reports br
  WHERE br.student_id = student_id_input
  ORDER BY br.created_at DESC;
END;
$$;

-- Function for admin to get all book reports
CREATE OR REPLACE FUNCTION public.admin_get_book_reports(
  admin_id_input uuid,
  status_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  student_id text,
  student_name text,
  student_grade integer,
  student_class integer,
  student_number integer,
  dept_name text,
  book_title text,
  content text,
  points_awarded integer,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid admin';
  END IF;

  RETURN QUERY
  SELECT 
    br.id,
    br.student_id,
    s.name as student_name,
    s.grade as student_grade,
    s.class as student_class,
    s.number as student_number,
    COALESCE(d.name, '') as dept_name,
    br.book_title,
    br.content,
    br.points_awarded,
    br.status,
    br.created_at
  FROM book_reports br
  JOIN students s ON s.student_id = br.student_id
  LEFT JOIN departments d ON d.code = s.dept_code
  WHERE (status_filter IS NULL OR br.status = status_filter)
  ORDER BY br.created_at DESC;
END;
$$;

-- Function for admin to award points
CREATE OR REPLACE FUNCTION public.admin_award_book_report_points(
  admin_id_input uuid,
  report_id_input uuid,
  points_input integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid admin';
  END IF;

  UPDATE book_reports
  SET 
    points_awarded = points_input,
    points_awarded_by = admin_id_input,
    points_awarded_at = now(),
    status = 'approved',
    updated_at = now()
  WHERE id = report_id_input;

  RETURN FOUND;
END;
$$;

-- Function to get book report leaderboard
CREATE OR REPLACE FUNCTION public.admin_get_book_report_leaderboard(
  admin_id_input uuid,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  student_id text,
  name text,
  grade integer,
  class integer,
  number integer,
  dept_name text,
  total_reports integer,
  total_points integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM teachers WHERE id = admin_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid admin';
  END IF;

  RETURN QUERY
  SELECT 
    s.student_id,
    s.name,
    s.grade,
    s.class,
    s.number,
    COALESCE(d.name, '') as dept_name,
    COUNT(br.id)::integer as total_reports,
    COALESCE(SUM(br.points_awarded), 0)::integer as total_points
  FROM students s
  LEFT JOIN departments d ON d.code = s.dept_code
  LEFT JOIN book_reports br ON br.student_id = s.student_id AND br.status = 'approved'
  WHERE (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  GROUP BY s.student_id, s.name, s.grade, s.class, s.number, d.name
  HAVING COALESCE(SUM(br.points_awarded), 0) > 0
  ORDER BY total_points DESC, total_reports DESC;
END;
$$;