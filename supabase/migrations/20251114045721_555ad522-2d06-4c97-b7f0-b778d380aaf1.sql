-- Create edufine_documents table
CREATE TABLE public.edufine_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rcv_date date,
  due date,
  dept text,
  subj text,
  doc_no text,
  att1 text,
  att2 text,
  att3 text,
  att4 text,
  att5 text,
  file_url text,
  admin_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edufine_documents ENABLE ROW LEVEL SECURITY;

-- Admins can view all documents
CREATE POLICY "Admins can view edufine documents"
ON public.edufine_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- Admins can insert documents
CREATE POLICY "Admins can insert edufine documents"
ON public.edufine_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
  AND admin_id::text = current_setting('app.current_admin_id', true)
);

-- Admins can update documents
CREATE POLICY "Admins can update edufine documents"
ON public.edufine_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- Admins can delete documents
CREATE POLICY "Admins can delete edufine documents"
ON public.edufine_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id::text = current_setting('app.current_admin_id', true)
  )
);

-- Create index for better query performance
CREATE INDEX idx_edufine_documents_rcv_date ON public.edufine_documents(rcv_date);
CREATE INDEX idx_edufine_documents_dept ON public.edufine_documents(dept);
CREATE INDEX idx_edufine_documents_doc_no ON public.edufine_documents(doc_no);