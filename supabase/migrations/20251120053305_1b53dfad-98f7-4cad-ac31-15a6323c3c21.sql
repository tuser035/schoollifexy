-- Get all existing policies on storage.objects for evidence-photos bucket
DO $$
DECLARE
    pol record;
BEGIN
    -- Drop all policies on storage.objects that mention 'evidence' in their name
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname ILIKE '%evidence%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Now create clean new policies
CREATE POLICY "teacher_upload_evidence_photos_2024"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'evidence-photos'
  AND current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) != ''
);

CREATE POLICY "teacher_select_evidence_photos_2024"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'evidence-photos'
  AND current_setting('app.current_teacher_id', true) IS NOT NULL
  AND current_setting('app.current_teacher_id', true) != ''
);

CREATE POLICY "admin_upload_evidence_photos_2024"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'evidence-photos'
  AND current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) != ''
);

CREATE POLICY "admin_select_evidence_photos_2024"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'evidence-photos'
  AND current_setting('app.current_admin_id', true) IS NOT NULL
  AND current_setting('app.current_admin_id', true) != ''
);

CREATE POLICY "teacher_admin_update_evidence_photos_2024"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'evidence-photos'
  AND (
    (current_setting('app.current_teacher_id', true) IS NOT NULL AND current_setting('app.current_teacher_id', true) != '')
    OR
    (current_setting('app.current_admin_id', true) IS NOT NULL AND current_setting('app.current_admin_id', true) != '')
  )
);