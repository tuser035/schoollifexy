-- ============================================
-- Database Schema Export
-- Generated: 2025-11-12
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================

-- pgcrypto extension is required for password hashing
-- This is typically enabled by default in Supabase

-- ============================================
-- TABLES
-- ============================================

-- Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL UNIQUE,
    name text NOT NULL,
    grade integer NOT NULL,
    class integer NOT NULL,
    number integer NOT NULL,
    dept_code text,
    nationality_code text,
    gmail text,
    student_call text,
    parents_call1 text,
    parents_call2 text,
    password_hash text NOT NULL DEFAULT extensions.crypt('12345678', extensions.gen_salt('bf')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    call_t text NOT NULL UNIQUE,
    teacher_email text NOT NULL,
    grade integer,
    class integer,
    dept_code text,
    is_homeroom boolean DEFAULT false,
    password_hash text NOT NULL DEFAULT extensions.crypt('1234qwert', extensions.gen_salt('bf')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Homeroom Table
CREATE TABLE IF NOT EXISTS public.homeroom (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    year integer NOT NULL DEFAULT EXTRACT(year FROM now()),
    grade integer NOT NULL,
    class integer NOT NULL,
    teacher_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(year, grade, class)
);

-- Merits Table
CREATE TABLE IF NOT EXISTS public.merits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text,
    teacher_id uuid,
    category text NOT NULL,
    reason text,
    score integer NOT NULL DEFAULT 1,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Demerits Table
CREATE TABLE IF NOT EXISTS public.demerits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text,
    teacher_id uuid,
    category text NOT NULL,
    reason text,
    score integer NOT NULL DEFAULT 1,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Monthly Recommendations Table
CREATE TABLE IF NOT EXISTS public.monthly (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text,
    teacher_id uuid,
    category text,
    reason text,
    image_url text,
    year integer NOT NULL,
    month integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Career Counseling Table
CREATE TABLE IF NOT EXISTS public.career_counseling (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id text NOT NULL,
    admin_id uuid NOT NULL,
    counselor_name text NOT NULL,
    counseling_date date NOT NULL DEFAULT CURRENT_DATE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeroom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demerits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_counseling ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - DEPARTMENTS
-- ============================================

CREATE POLICY "Anyone can view departments"
ON public.departments FOR SELECT
USING (true);

CREATE POLICY "Admins can insert departments"
ON public.departments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can update departments"
ON public.departments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can delete departments"
ON public.departments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- RLS POLICIES - STUDENTS
-- ============================================

CREATE POLICY "Allow anonymous login for students"
ON public.students FOR SELECT
USING (true);

CREATE POLICY "Students can view own data"
ON public.students FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Teachers can view all students"
ON public.students FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.teachers
        WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
    )
);

CREATE POLICY "Admins have full access to students"
ON public.students FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can insert students"
ON public.students FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- RLS POLICIES - TEACHERS
-- ============================================

CREATE POLICY "Allow anonymous login for teachers"
ON public.teachers FOR SELECT
USING (true);

CREATE POLICY "Admins have full access to teachers"
ON public.teachers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can insert teachers"
ON public.teachers FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- RLS POLICIES - ADMINS
-- ============================================

CREATE POLICY "Allow anonymous login for admins"
ON public.admins FOR SELECT
USING (true);

-- ============================================
-- RLS POLICIES - HOMEROOM
-- ============================================

CREATE POLICY "Admins have full access to homeroom"
ON public.homeroom FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can insert homeroom"
ON public.homeroom FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- RLS POLICIES - MERITS
-- ============================================

CREATE POLICY "Students can view own merits"
ON public.merits FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Teachers can view all merits"
ON public.merits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.teachers
        WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
    )
);

CREATE POLICY "Teachers can insert merits"
ON public.merits FOR INSERT
WITH CHECK (teacher_id::text = current_setting('app.current_teacher_id', true));

CREATE POLICY "Admins have full access to merits"
ON public.merits FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can insert merits"
ON public.merits FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- RLS POLICIES - DEMERITS
-- ============================================

CREATE POLICY "Students can view own demerits"
ON public.demerits FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Teachers can view all demerits"
ON public.demerits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.teachers
        WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
    )
);

CREATE POLICY "Teachers can insert demerits"
ON public.demerits FOR INSERT
WITH CHECK (teacher_id::text = current_setting('app.current_teacher_id', true));

CREATE POLICY "Admins have full access to demerits"
ON public.demerits FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can insert demerits"
ON public.demerits FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- RLS POLICIES - MONTHLY
-- ============================================

CREATE POLICY "Students can view own monthly"
ON public.monthly FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Teachers can view all monthly"
ON public.monthly FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.teachers
        WHERE teachers.id::text = current_setting('app.current_teacher_id', true)
    )
);

CREATE POLICY "Teachers can insert monthly recommendations"
ON public.monthly FOR INSERT
WITH CHECK (
    teacher_id IS NOT NULL AND (
        teacher_id::text = current_setting('app.current_teacher_id', true) OR
        EXISTS (
            SELECT 1 FROM public.admins
            WHERE admins.id::text = current_setting('app.current_admin_id', true)
        )
    )
);

CREATE POLICY "Admins have full access to monthly"
ON public.monthly FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can insert monthly"
ON public.monthly FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- RLS POLICIES - CAREER COUNSELING
-- ============================================

CREATE POLICY "Admins can view all counseling records"
ON public.career_counseling FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can insert counseling records"
ON public.career_counseling FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    ) AND admin_id::text = current_setting('app.current_admin_id', true)
);

CREATE POLICY "Admins can update counseling records"
ON public.career_counseling FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

CREATE POLICY "Admins can delete counseling records"
ON public.career_counseling FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.admins
        WHERE admins.id::text = current_setting('app.current_admin_id', true)
    )
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Session management functions
CREATE OR REPLACE FUNCTION public.set_student_session(student_id_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_teacher_session(teacher_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_session(admin_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.current_admin_id', admin_id_input::text, false);
END;
$$;

-- Password verification functions
CREATE OR REPLACE FUNCTION public.verify_student_password(student_id_input text, password_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.students
  WHERE student_id = student_id_input;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = extensions.crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_teacher_password(phone_input text, password_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.teachers
  WHERE call_t = phone_input;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = extensions.crypt(password_input, stored_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_password(email_input text, password_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM public.admins
  WHERE email = email_input;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = extensions.crypt(password_input, stored_hash);
END;
$$;

-- Password update functions
CREATE OR REPLACE FUNCTION public.update_student_password(student_id_input text, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.students
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE student_id = student_id_input;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_teacher_password(teacher_id_input uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.teachers
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = teacher_id_input;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_admin_password(admin_id_input uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  UPDATE public.admins
  SET password_hash = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = admin_id_input;
  
  RETURN FOUND;
END;
$$;

-- Monthly recommendation insertion
CREATE OR REPLACE FUNCTION public.insert_monthly_recommendation(
  student_id_input text,
  teacher_id_input uuid,
  category_input text,
  reason_input text,
  image_url_input text,
  year_input integer,
  month_input integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id uuid;
BEGIN
  PERFORM set_config('app.current_teacher_id', teacher_id_input::text, true);

  INSERT INTO public.monthly (
    student_id, teacher_id, category, reason, image_url, year, month
  ) VALUES (
    student_id_input, teacher_id_input, category_input, reason_input, image_url_input, year_input, month_input
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Admin query functions
CREATE OR REPLACE FUNCTION public.admin_get_students(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
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
  student_call text,
  gmail text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    s.student_id,
    s.name,
    s.grade,
    s.class,
    s.number,
    COALESCE(d.name, '-') as dept_name,
    COALESCE(s.student_call, '-') as student_call,
    COALESCE(s.gmail, '-') as gmail
  FROM public.students s
  LEFT JOIN public.departments d ON s.dept_code = d.code
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY s.grade, s.class, s.number
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_teachers(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  name text,
  call_t text,
  teacher_email text,
  grade integer,
  class integer,
  is_homeroom boolean,
  dept_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    t.name,
    t.call_t,
    t.teacher_email,
    t.grade,
    t.class,
    t.is_homeroom,
    COALESCE(d.name, '-') as dept_name
  FROM public.teachers t
  LEFT JOIN public.departments d ON t.dept_code = d.code
  WHERE 
    (search_text IS NULL OR t.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR t.grade = search_grade)
    AND (search_class IS NULL OR t.class = search_class)
  ORDER BY t.name
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_homeroom(
  admin_id_input uuid,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  year integer,
  grade integer,
  class integer,
  teacher_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    h.year,
    h.grade,
    h.class,
    COALESCE(t.name, '-') as teacher_name
  FROM public.homeroom h
  LEFT JOIN public.teachers t ON h.teacher_id = t.id
  WHERE 
    (search_grade IS NULL OR h.grade = search_grade)
    AND (search_class IS NULL OR h.class = search_class)
  ORDER BY h.grade, h.class
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_merits(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  created_at timestamp with time zone,
  student_name text,
  student_grade integer,
  student_class integer,
  teacher_name text,
  category text,
  reason text,
  score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT m.created_at, s.name, s.grade, s.class, t.name, m.category, m.reason, m.score
  FROM public.merits m
  LEFT JOIN public.students s ON s.student_id = m.student_id
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%' OR t.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY m.created_at DESC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_demerits(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  created_at timestamp with time zone,
  student_name text,
  student_grade integer,
  student_class integer,
  teacher_name text,
  category text,
  reason text,
  score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT d.created_at, s.name, s.grade, s.class, t.name, d.category, d.reason, d.score
  FROM public.demerits d
  LEFT JOIN public.students s ON s.student_id = d.student_id
  LEFT JOIN public.teachers t ON t.id = d.teacher_id
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%' OR t.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY d.created_at DESC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_monthly(
  admin_id_input uuid,
  search_text text DEFAULT NULL,
  search_grade integer DEFAULT NULL,
  search_class integer DEFAULT NULL
)
RETURNS TABLE(
  student_id text,
  year integer,
  month integer,
  student_name text,
  student_grade integer,
  student_class integer,
  teacher_name text,
  category text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT m.student_id, m.year, m.month, s.name, s.grade, s.class, t.name, COALESCE(m.category, '-'), COALESCE(m.reason, '-')
  FROM public.monthly m
  LEFT JOIN public.students s ON s.student_id = m.student_id
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE 
    (search_text IS NULL OR s.name ILIKE '%' || search_text || '%')
    AND (search_grade IS NULL OR s.grade = search_grade)
    AND (search_class IS NULL OR s.class = search_class)
  ORDER BY m.year DESC, m.month DESC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_merit_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  created_at timestamp with time zone,
  teacher_name text,
  category text,
  reason text,
  score integer,
  image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT m.created_at, COALESCE(t.name, '-'), m.category, COALESCE(m.reason, '-'), m.score, m.image_url
  FROM public.merits m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_demerit_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  created_at timestamp with time zone,
  teacher_name text,
  category text,
  reason text,
  score integer,
  image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT d.created_at, COALESCE(t.name, '-'), d.category, COALESCE(d.reason, '-'), d.score, d.image_url
  FROM public.demerits d
  LEFT JOIN public.teachers t ON t.id = d.teacher_id
  WHERE d.student_id = student_id_input
  ORDER BY d.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_monthly_details(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  created_at timestamp with time zone,
  teacher_name text,
  category text,
  reason text,
  image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT m.created_at, COALESCE(t.name, '-'), COALESCE(m.category, '-'), COALESCE(m.reason, '-'), m.image_url
  FROM public.monthly m
  LEFT JOIN public.teachers t ON t.id = m.teacher_id
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_student_points_by_class(
  admin_id_input uuid,
  p_grade integer,
  p_class integer
)
RETURNS TABLE(
  student_id text,
  name text,
  merits integer,
  demerits integer,
  monthly integer,
  total integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  WITH s AS (
    SELECT st.student_id, st.name 
    FROM public.students st 
    WHERE st.grade = p_grade AND st.class = p_class
  ),
  m AS (
    SELECT me.student_id, COALESCE(SUM(me.score),0)::integer AS merits 
    FROM public.merits me
    WHERE me.student_id IN (SELECT s.student_id FROM s)
    GROUP BY me.student_id
  ),
  d AS (
    SELECT de.student_id, COALESCE(SUM(de.score),0)::integer AS demerits 
    FROM public.demerits de
    WHERE de.student_id IN (SELECT s.student_id FROM s)
    GROUP BY de.student_id
  ),
  mo AS (
    SELECT mo_inner.student_id, COUNT(*)::integer AS monthly 
    FROM public.monthly mo_inner
    WHERE mo_inner.student_id IN (SELECT s.student_id FROM s)
    GROUP BY mo_inner.student_id
  )
  SELECT 
    s.student_id, 
    s.name,
    COALESCE(m.merits,0)::integer AS merits,
    COALESCE(d.demerits,0)::integer AS demerits,
    COALESCE(mo.monthly,0)::integer AS monthly,
    (COALESCE(m.merits,0) - COALESCE(d.demerits,0))::integer AS total
  FROM s
  LEFT JOIN m ON m.student_id = s.student_id
  LEFT JOIN d ON d.student_id = s.student_id
  LEFT JOIN mo ON mo.student_id = s.student_id
  ORDER BY s.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_counseling_records(
  admin_id_input uuid,
  student_id_input text
)
RETURNS TABLE(
  id uuid,
  counselor_name text,
  counseling_date date,
  content text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input) THEN
    RAISE EXCEPTION '관리자 권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT 
    cc.id,
    cc.counselor_name,
    cc.counseling_date,
    cc.content,
    cc.created_at
  FROM public.career_counseling cc
  WHERE cc.student_id = student_id_input
  ORDER BY cc.counseling_date DESC, cc.created_at DESC;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_career_counseling_updated_at
BEFORE UPDATE ON public.career_counseling
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Note: Storage bucket 'evidence-photos' exists (public)
-- Storage policies should be configured via Supabase dashboard

-- ============================================
-- END OF SCHEMA
-- ============================================
