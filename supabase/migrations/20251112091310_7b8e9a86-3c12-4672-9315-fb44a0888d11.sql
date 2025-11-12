-- Drop existing insert policies if they exist and recreate them
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can insert homeroom" ON public.homeroom;
DROP POLICY IF EXISTS "Admins can insert merits" ON public.merits;
DROP POLICY IF EXISTS "Admins can insert demerits" ON public.demerits;
DROP POLICY IF EXISTS "Admins can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can insert monthly" ON public.monthly;

-- Students table
CREATE POLICY "Admins can insert students"
  ON public.students
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (id)::text = current_setting('app.current_admin_id', true)
    )
  );

-- Teachers table  
CREATE POLICY "Admins can insert teachers"
  ON public.teachers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (id)::text = current_setting('app.current_admin_id', true)
    )
  );

-- Homeroom table
CREATE POLICY "Admins can insert homeroom"
  ON public.homeroom
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (id)::text = current_setting('app.current_admin_id', true)
    )
  );

-- Merits table
CREATE POLICY "Admins can insert merits"
  ON public.merits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (id)::text = current_setting('app.current_admin_id', true)
    )
  );

-- Demerits table
CREATE POLICY "Admins can insert demerits"
  ON public.demerits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (id)::text = current_setting('app.current_admin_id', true)
    )
  );

-- Departments table
CREATE POLICY "Admins can insert departments"
  ON public.departments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (id)::text = current_setting('app.current_admin_id', true)
    )
  );

-- Monthly table
CREATE POLICY "Admins can insert monthly"
  ON public.monthly
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE (id)::text = current_setting('app.current_admin_id', true)
    )
  );