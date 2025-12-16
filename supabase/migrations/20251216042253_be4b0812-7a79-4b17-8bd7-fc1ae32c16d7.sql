-- Update email-attachments bucket to allow all MIME types
UPDATE storage.buckets 
SET allowed_mime_types = NULL
WHERE id = 'email-attachments';