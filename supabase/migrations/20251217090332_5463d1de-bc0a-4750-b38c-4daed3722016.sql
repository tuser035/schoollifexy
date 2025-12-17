-- Create mindtalk_playlists table for storing user playlists
CREATE TABLE public.mindtalk_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  playlist_name TEXT NOT NULL,
  music_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mindtalk_playlists ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Students can view own playlists"
ON public.mindtalk_playlists FOR SELECT
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can insert own playlists"
ON public.mindtalk_playlists FOR INSERT
WITH CHECK (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can update own playlists"
ON public.mindtalk_playlists FOR UPDATE
USING (student_id = current_setting('app.current_student_id', true));

CREATE POLICY "Students can delete own playlists"
ON public.mindtalk_playlists FOR DELETE
USING (student_id = current_setting('app.current_student_id', true));

-- Index for faster queries
CREATE INDEX idx_mindtalk_playlists_student ON public.mindtalk_playlists(student_id);

-- RPC function to save playlist
CREATE OR REPLACE FUNCTION student_save_playlist(
  student_id_input TEXT,
  playlist_name_input TEXT,
  music_ids_input UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  INSERT INTO mindtalk_playlists (student_id, playlist_name, music_ids)
  VALUES (student_id_input, playlist_name_input, music_ids_input)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- RPC function to get playlists
CREATE OR REPLACE FUNCTION student_get_playlists(student_id_input TEXT)
RETURNS TABLE (
  id UUID,
  playlist_name TEXT,
  music_ids UUID[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  RETURN QUERY
  SELECT p.id, p.playlist_name, p.music_ids, p.created_at, p.updated_at
  FROM mindtalk_playlists p
  WHERE p.student_id = student_id_input
  ORDER BY p.updated_at DESC;
END;
$$;

-- RPC function to update playlist
CREATE OR REPLACE FUNCTION student_update_playlist(
  student_id_input TEXT,
  playlist_id_input UUID,
  playlist_name_input TEXT,
  music_ids_input UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  UPDATE mindtalk_playlists
  SET playlist_name = playlist_name_input,
      music_ids = music_ids_input,
      updated_at = now()
  WHERE id = playlist_id_input AND student_id = student_id_input;
  
  RETURN FOUND;
END;
$$;

-- RPC function to delete playlist
CREATE OR REPLACE FUNCTION student_delete_playlist(
  student_id_input TEXT,
  playlist_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.current_student_id', student_id_input, true);
  
  DELETE FROM mindtalk_playlists
  WHERE id = playlist_id_input AND student_id = student_id_input;
  
  RETURN FOUND;
END;
$$;