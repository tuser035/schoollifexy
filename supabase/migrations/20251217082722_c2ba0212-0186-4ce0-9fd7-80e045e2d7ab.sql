
-- Create mindtalk_music table for music metadata
CREATE TABLE public.mindtalk_music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '힐링',
  file_path TEXT NOT NULL,
  duration_seconds INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mindtalk_music ENABLE ROW LEVEL SECURITY;

-- Students can view active music
CREATE POLICY "Students can view active music"
ON public.mindtalk_music
FOR SELECT
USING (is_active = true);

-- Admins can manage music
CREATE POLICY "Admins can manage music"
ON public.mindtalk_music
FOR ALL
USING (
  (current_setting('app.current_admin_id', true) IS NOT NULL) AND 
  (current_setting('app.current_admin_id', true) <> '')
);

-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public)
VALUES ('mindtalk-music', 'mindtalk-music', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to music files
CREATE POLICY "Public can read music files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'mindtalk-music');

-- Admins can upload music files
CREATE POLICY "Admins can upload music files"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'mindtalk-music');

-- Admins can delete music files
CREATE POLICY "Admins can delete music files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'mindtalk-music');

-- Create function to get music list for students
CREATE OR REPLACE FUNCTION public.get_mindtalk_music()
RETURNS TABLE(
  id UUID,
  title TEXT,
  category TEXT,
  file_path TEXT,
  duration_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.title, m.category, m.file_path, m.duration_seconds
  FROM public.mindtalk_music m
  WHERE m.is_active = true
  ORDER BY m.category, m.title;
END;
$$;

-- Create function to increment play count
CREATE OR REPLACE FUNCTION public.increment_music_play_count(music_id_input UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.mindtalk_music
  SET play_count = play_count + 1, updated_at = now()
  WHERE id = music_id_input;
  RETURN FOUND;
END;
$$;

-- Create function for admin to manage music
CREATE OR REPLACE FUNCTION public.admin_get_mindtalk_music(admin_id_input UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  category TEXT,
  file_path TEXT,
  duration_seconds INTEGER,
  is_active BOOLEAN,
  play_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE admins.id = admin_id_input)
     AND NOT EXISTS (SELECT 1 FROM public.teachers WHERE teachers.id = admin_id_input) THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  RETURN QUERY
  SELECT m.id, m.title, m.category, m.file_path, m.duration_seconds, m.is_active, m.play_count, m.created_at
  FROM public.mindtalk_music m
  ORDER BY m.created_at DESC;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_mindtalk_music_updated_at
BEFORE UPDATE ON public.mindtalk_music
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
