-- Email activity log: one row per email we attempt to send via Resend.
-- Webhook updates delivered_at/opened_at/bounced_at as Resend reports events.
CREATE TABLE IF NOT EXISTS email_log (
  id bigserial PRIMARY KEY,
  person_id integer REFERENCES people(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,              -- 'all_clear' | 'low_overdue' | 'high_overdue'
  overdue_count int DEFAULT 0,
  status text NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  error_message text,
  resend_id text UNIQUE,               -- id returned by Resend's POST /emails
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,               -- first open
  open_count int NOT NULL DEFAULT 0,
  bounced_at timestamptz,
  complained_at timestamptz
);

CREATE INDEX IF NOT EXISTS email_log_person_id_idx ON email_log(person_id);
CREATE INDEX IF NOT EXISTS email_log_sent_at_idx ON email_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS email_log_resend_id_idx ON email_log(resend_id);
