-- Drop existing public settings policy
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.system_settings;

-- Recreate with school_name_en included
CREATE POLICY "Anyone can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (setting_key = ANY (ARRAY['school_symbol_url'::text, 'favicon_url'::text, 'school_name'::text, 'school_name_en'::text]));