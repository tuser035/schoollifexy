-- Create counseling-attachments storage bucket for teacher email attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('counseling-attachments', 'counseling-attachments', true);

-- Create RLS policies for counseling-attachments bucket
CREATE POLICY "Anyone can view counseling attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'counseling-attachments');

CREATE POLICY "Authenticated users can upload counseling attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'counseling-attachments');

CREATE POLICY "Authenticated users can update counseling attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'counseling-attachments');

CREATE POLICY "Authenticated users can delete counseling attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'counseling-attachments');