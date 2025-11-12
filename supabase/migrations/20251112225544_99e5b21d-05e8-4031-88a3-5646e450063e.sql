-- Storage 관리자 삭제 권한 추가
CREATE POLICY "Admins can delete files from evidence-photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidence-photos' 
  AND EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.id::text = current_setting('app.current_admin_id', true)
  )
);