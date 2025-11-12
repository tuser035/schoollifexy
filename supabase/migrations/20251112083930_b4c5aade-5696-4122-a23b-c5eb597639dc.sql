-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert department data
INSERT INTO public.departments (code, name) VALUES
  ('t', '관광서비스'),
  ('g', '글로벌경영'),
  ('s', '스포츠마케팅'),
  ('i', 'IT융합정보'),
  ('y', '유튜브창업')
ON CONFLICT (code) DO NOTHING;

-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT UNIQUE NOT NULL,
  dept_code TEXT REFERENCES public.departments(code),
  grade INTEGER NOT NULL,
  class INTEGER NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  gmail TEXT,
  student_call TEXT,
  parents_call1 TEXT,
  parents_call2 TEXT,
  password_hash TEXT NOT NULL DEFAULT crypt('12345678', gen_salt('bf')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  grade INTEGER,
  class INTEGER,
  dept_code TEXT REFERENCES public.departments(code),
  call_t TEXT UNIQUE NOT NULL,
  is_homeroom BOOLEAN DEFAULT false,
  password_hash TEXT NOT NULL DEFAULT crypt('1234qwert', gen_salt('bf')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create admin table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create merits table
CREATE TABLE IF NOT EXISTS public.merits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.students(student_id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id),
  category TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create demerits table
CREATE TABLE IF NOT EXISTS public.demerits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.students(student_id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id),
  category TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create monthly student recommendations table
CREATE TABLE IF NOT EXISTS public.monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.students(student_id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create homeroom assignments table
CREATE TABLE IF NOT EXISTS public.homeroom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id),
  grade INTEGER NOT NULL,
  class INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grade, class, year)
);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demerits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeroom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Students can view their own data
CREATE POLICY "Students can view own data" ON public.students
  FOR SELECT USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can view own merits" ON public.merits
  FOR SELECT USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can view own demerits" ON public.demerits
  FOR SELECT USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can view own monthly" ON public.monthly
  FOR SELECT USING (student_id = current_setting('app.current_student_id', true));

-- Teachers can view all students and manage points
CREATE POLICY "Teachers can view all students" ON public.students
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true)));

CREATE POLICY "Teachers can insert merits" ON public.merits
  FOR INSERT WITH CHECK (teacher_id::text = current_setting('app.current_teacher_id', true));

CREATE POLICY "Teachers can view all merits" ON public.merits
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true)));

CREATE POLICY "Teachers can insert demerits" ON public.demerits
  FOR INSERT WITH CHECK (teacher_id::text = current_setting('app.current_teacher_id', true));

CREATE POLICY "Teachers can view all demerits" ON public.demerits
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true)));

CREATE POLICY "Teachers can insert monthly recommendations" ON public.monthly
  FOR INSERT WITH CHECK (teacher_id::text = current_setting('app.current_teacher_id', true));

CREATE POLICY "Teachers can view all monthly" ON public.monthly
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.teachers WHERE id::text = current_setting('app.current_teacher_id', true)));

-- Admins have full access
CREATE POLICY "Admins have full access to students" ON public.students
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true)));

CREATE POLICY "Admins have full access to teachers" ON public.teachers
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true)));

CREATE POLICY "Admins have full access to merits" ON public.merits
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true)));

CREATE POLICY "Admins have full access to demerits" ON public.demerits
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true)));

CREATE POLICY "Admins have full access to monthly" ON public.monthly
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true)));

CREATE POLICY "Admins have full access to homeroom" ON public.homeroom
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id::text = current_setting('app.current_admin_id', true)));

-- Public read access to departments
CREATE POLICY "Anyone can view departments" ON public.departments
  FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_teachers_call_t ON public.teachers(call_t);
CREATE INDEX IF NOT EXISTS idx_merits_student_id ON public.merits(student_id);
CREATE INDEX IF NOT EXISTS idx_demerits_student_id ON public.demerits(student_id);
CREATE INDEX IF NOT EXISTS idx_monthly_student_id ON public.monthly(student_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
