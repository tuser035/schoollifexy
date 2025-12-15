-- 기존 정책 삭제
DROP POLICY IF EXISTS "email_attachments_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "email_attachments_select_policy" ON storage.objects;

-- anon 역할에 명시적으로 권한 부여
CREATE POLICY "email_attachments_insert_anon"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "email_attachments_select_anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'email-attachments');

-- authenticated 역할에도 권한 부여
CREATE POLICY "email_attachments_insert_auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-attachments');

CREATE POLICY "email_attachments_select_auth"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'email-attachments');