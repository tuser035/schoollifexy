-- Add RLS policies for admins to manage storybooks
CREATE POLICY "Admins can insert storybooks"
ON public.storybooks
FOR INSERT
WITH CHECK (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);

CREATE POLICY "Admins can update storybooks"
ON public.storybooks
FOR UPDATE
USING (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);

CREATE POLICY "Admins can delete storybooks"
ON public.storybooks
FOR DELETE
USING (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);

CREATE POLICY "Admins can view all storybooks"
ON public.storybooks
FOR SELECT
USING (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);

-- Add RLS policies for storybook_pages as well
CREATE POLICY "Admins can insert storybook pages"
ON public.storybook_pages
FOR INSERT
WITH CHECK (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);

CREATE POLICY "Admins can update storybook pages"
ON public.storybook_pages
FOR UPDATE
USING (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);

CREATE POLICY "Admins can delete storybook pages"
ON public.storybook_pages
FOR DELETE
USING (
  (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
  AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
);