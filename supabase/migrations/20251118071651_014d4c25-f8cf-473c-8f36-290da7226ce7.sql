-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT,
  user_type TEXT, -- 'student', 'teacher', 'admin', 'anonymous'
  action_type TEXT NOT NULL, -- 'login_success', 'login_failed', 'insert', 'update', 'delete'
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT, -- 'success', 'failed'
  error_message TEXT
);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- System can insert audit logs (SECURITY DEFINER functions)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id TEXT,
  p_user_type TEXT,
  p_action_type TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id TEXT DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, user_type, action_type, table_name, record_id,
    old_data, new_data, status, error_message
  ) VALUES (
    p_user_id, p_user_type, p_action_type, p_table_name, p_record_id,
    p_old_data, p_new_data, p_status, p_error_message
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Update student login function to include audit logging
CREATE OR REPLACE FUNCTION public.student_login(
  student_id_input TEXT,
  password_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  student_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get student record
  SELECT * INTO student_record
  FROM public.students
  WHERE student_id = student_id_input;
  
  IF NOT FOUND THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      student_id_input,
      'student',
      'login_failed',
      'students',
      NULL,
      NULL,
      NULL,
      'failed',
      '학생을 찾을 수 없습니다'
    );
    RAISE EXCEPTION '학생을 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := student_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      student_id_input,
      'student',
      'login_failed',
      'students',
      student_record.id::text,
      NULL,
      NULL,
      'failed',
      '비밀번호가 일치하지 않습니다'
    );
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_student_id', student_id_input, false);
  
  -- Log successful login
  PERFORM log_audit_event(
    student_id_input,
    'student',
    'login_success',
    'students',
    student_record.id::text
  );
  
  -- Return student data (excluding password)
  RETURN json_build_object(
    'id', student_record.id,
    'student_id', student_record.student_id,
    'name', student_record.name,
    'grade', student_record.grade,
    'class', student_record.class
  );
END;
$$;

-- Update teacher login function to include audit logging
CREATE OR REPLACE FUNCTION public.teacher_login(
  phone_input TEXT,
  password_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  teacher_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get teacher record
  SELECT * INTO teacher_record
  FROM public.teachers
  WHERE call_t = phone_input;
  
  IF NOT FOUND THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      phone_input,
      'teacher',
      'login_failed',
      'teachers',
      NULL,
      NULL,
      NULL,
      'failed',
      '교사를 찾을 수 없습니다'
    );
    RAISE EXCEPTION '교사를 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := teacher_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      teacher_record.id::text,
      'teacher',
      'login_failed',
      'teachers',
      teacher_record.id::text,
      NULL,
      NULL,
      'failed',
      '비밀번호가 일치하지 않습니다'
    );
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_teacher_id', teacher_record.id::text, false);
  
  -- Log successful login
  PERFORM log_audit_event(
    teacher_record.id::text,
    'teacher',
    'login_success',
    'teachers',
    teacher_record.id::text
  );
  
  -- Return teacher data (excluding password)
  RETURN json_build_object(
    'id', teacher_record.id,
    'name', teacher_record.name,
    'email', teacher_record.teacher_email,
    'is_homeroom', teacher_record.is_homeroom,
    'grade', teacher_record.grade,
    'class', teacher_record.class
  );
END;
$$;

-- Update admin login function to include audit logging
CREATE OR REPLACE FUNCTION public.admin_login(
  email_input TEXT,
  password_input TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  admin_record RECORD;
  stored_hash TEXT;
BEGIN
  -- Get admin record
  SELECT * INTO admin_record
  FROM public.admins
  WHERE email = email_input;
  
  IF NOT FOUND THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      email_input,
      'admin',
      'login_failed',
      'admins',
      NULL,
      NULL,
      NULL,
      'failed',
      '관리자를 찾을 수 없습니다'
    );
    RAISE EXCEPTION '관리자를 찾을 수 없습니다';
  END IF;
  
  -- Verify password
  stored_hash := admin_record.password_hash;
  IF stored_hash != extensions.crypt(password_input, stored_hash) THEN
    -- Log failed login attempt
    PERFORM log_audit_event(
      admin_record.id::text,
      'admin',
      'login_failed',
      'admins',
      admin_record.id::text,
      NULL,
      NULL,
      'failed',
      '비밀번호가 일치하지 않습니다'
    );
    RAISE EXCEPTION '비밀번호가 일치하지 않습니다';
  END IF;
  
  -- Set session
  PERFORM set_config('app.current_admin_id', admin_record.id::text, false);
  
  -- Log successful login
  PERFORM log_audit_event(
    admin_record.id::text,
    'admin',
    'login_success',
    'admins',
    admin_record.id::text
  );
  
  -- Return admin data (excluding password)
  RETURN json_build_object(
    'id', admin_record.id,
    'email', admin_record.email
  );
END;
$$;

-- Trigger function to log data changes
CREATE OR REPLACE FUNCTION public.log_data_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT;
  v_user_type TEXT;
BEGIN
  -- Determine user type and id
  IF current_setting('app.current_student_id', true) IS NOT NULL THEN
    v_user_id := current_setting('app.current_student_id', true);
    v_user_type := 'student';
  ELSIF current_setting('app.current_teacher_id', true) IS NOT NULL THEN
    v_user_id := current_setting('app.current_teacher_id', true);
    v_user_type := 'teacher';
  ELSIF current_setting('app.current_admin_id', true) IS NOT NULL THEN
    v_user_id := current_setting('app.current_admin_id', true);
    v_user_type := 'admin';
  ELSE
    v_user_id := 'system';
    v_user_type := 'system';
  END IF;

  -- Log the change
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      v_user_id,
      v_user_type,
      'insert',
      TG_TABLE_NAME,
      NEW.id::text,
      NULL,
      row_to_json(NEW)::jsonb
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event(
      v_user_id,
      v_user_type,
      'update',
      TG_TABLE_NAME,
      NEW.id::text,
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      v_user_id,
      v_user_type,
      'delete',
      TG_TABLE_NAME,
      OLD.id::text,
      row_to_json(OLD)::jsonb,
      NULL
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers to important tables
CREATE TRIGGER audit_students_changes
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE TRIGGER audit_teachers_changes
AFTER INSERT OR UPDATE OR DELETE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE TRIGGER audit_admins_changes
AFTER INSERT OR UPDATE OR DELETE ON public.admins
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE TRIGGER audit_merits_changes
AFTER INSERT OR UPDATE OR DELETE ON public.merits
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE TRIGGER audit_demerits_changes
AFTER INSERT OR UPDATE OR DELETE ON public.demerits
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE TRIGGER audit_monthly_changes
AFTER INSERT OR UPDATE OR DELETE ON public.monthly
FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE TRIGGER audit_career_counseling_changes
AFTER INSERT OR UPDATE OR DELETE ON public.career_counseling
FOR EACH ROW EXECUTE FUNCTION log_data_change();