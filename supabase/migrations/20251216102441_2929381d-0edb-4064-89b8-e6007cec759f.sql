-- 마음톡 대화 기록 테이블
CREATE TABLE public.mindtalk_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 마음톡 위험 알림 기록 테이블
CREATE TABLE public.mindtalk_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  dangerous_word_count INTEGER NOT NULL DEFAULT 0,
  last_alert_sent_at TIMESTAMP WITH TIME ZONE,
  last_alert_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

-- Enable RLS
ALTER TABLE public.mindtalk_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mindtalk_alerts ENABLE ROW LEVEL SECURITY;

-- RPC: 학생 마음톡 메시지 저장
CREATE OR REPLACE FUNCTION public.student_save_mindtalk_message(
  student_id_input TEXT,
  role_input TEXT,
  content_input TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO mindtalk_messages (student_id, role, content)
  VALUES (student_id_input, role_input, content_input)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- RPC: 학생 마음톡 메시지 조회
CREATE OR REPLACE FUNCTION public.student_get_mindtalk_messages(
  student_id_input TEXT
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.role, m.content, m.created_at
  FROM mindtalk_messages m
  WHERE m.student_id = student_id_input
  ORDER BY m.created_at ASC;
END;
$$;

-- RPC: 위험 단어 카운트 업데이트 및 조회
CREATE OR REPLACE FUNCTION public.update_mindtalk_danger_count(
  student_id_input TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS TABLE (
  total_count INTEGER,
  should_alert BOOLEAN,
  last_alert_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  current_last_alert INTEGER;
BEGIN
  -- Upsert the alert record
  INSERT INTO mindtalk_alerts (student_id, dangerous_word_count, last_alert_count)
  VALUES (student_id_input, increment_by, 0)
  ON CONFLICT (student_id) DO UPDATE
  SET dangerous_word_count = mindtalk_alerts.dangerous_word_count + increment_by,
      updated_at = now()
  RETURNING mindtalk_alerts.dangerous_word_count, mindtalk_alerts.last_alert_count
  INTO current_count, current_last_alert;
  
  -- Check if we should send alert (every 3 counts)
  RETURN QUERY
  SELECT 
    current_count,
    (current_count >= 3 AND current_count - current_last_alert >= 3)::BOOLEAN,
    current_last_alert;
END;
$$;

-- RPC: 알림 발송 후 업데이트
CREATE OR REPLACE FUNCTION public.update_mindtalk_alert_sent(
  student_id_input TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE mindtalk_alerts
  SET last_alert_sent_at = now(),
      last_alert_count = dangerous_word_count,
      updated_at = now()
  WHERE student_id = student_id_input;
  
  RETURN FOUND;
END;
$$;

-- RPC: 학생 위험 카운트 조회
CREATE OR REPLACE FUNCTION public.get_mindtalk_danger_count(
  student_id_input TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_val INTEGER;
BEGIN
  SELECT dangerous_word_count INTO count_val
  FROM mindtalk_alerts
  WHERE student_id = student_id_input;
  
  RETURN COALESCE(count_val, 0);
END;
$$;