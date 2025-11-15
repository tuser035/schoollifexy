-- Add template type enum
CREATE TYPE public.template_type AS ENUM ('email', 'messenger');

-- Add template_type column to email_templates table
ALTER TABLE public.email_templates 
ADD COLUMN template_type public.template_type NOT NULL DEFAULT 'email';

-- Add index for better query performance
CREATE INDEX idx_email_templates_type ON public.email_templates(template_type);