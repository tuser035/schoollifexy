-- Allow anonymous users to read from admins, teachers, and students tables for login
CREATE POLICY "Allow anonymous login for admins"
  ON public.admins
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous login for teachers"
  ON public.teachers
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous login for students"
  ON public.students
  FOR SELECT
  TO anon
  USING (true);

-- Fix admin password hash
UPDATE public.admins
SET password_hash = crypt('1234qwert', gen_salt('bf'))
WHERE email = 'gyeongjuhs@naver.com';