-- Add email open tracking fields to email_history table
ALTER TABLE email_history 
ADD COLUMN opened boolean DEFAULT false,
ADD COLUMN opened_at timestamp with time zone,
ADD COLUMN resend_email_id text;

-- Add index for faster queries
CREATE INDEX idx_email_history_resend_id ON email_history(resend_email_id);
CREATE INDEX idx_email_history_opened ON email_history(opened);

-- Add comment
COMMENT ON COLUMN email_history.opened IS 'Whether the email has been opened by recipient';
COMMENT ON COLUMN email_history.opened_at IS 'Timestamp when email was first opened';
COMMENT ON COLUMN email_history.resend_email_id IS 'Resend API email ID for tracking';