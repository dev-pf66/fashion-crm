-- Notification analytics log: one row per person per cron slot run
CREATE TABLE IF NOT EXISTS notification_logs (
  id              bigserial PRIMARY KEY,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  slot            text NOT NULL,   -- 'morning' | 'evening'
  person_name     text,
  person_email    text,
  status          text NOT NULL,   -- 'sent' | 'failed'
  overdue_count   int DEFAULT 0,
  due_today_count int DEFAULT 0,
  due_tomorrow_count int DEFAULT 0,
  completed_yesterday_count int DEFAULT 0,
  completed_today_count int DEFAULT 0
);

CREATE INDEX IF NOT EXISTS notification_logs_sent_at_idx ON notification_logs (sent_at DESC);
CREATE INDEX IF NOT EXISTS notification_logs_slot_idx    ON notification_logs (slot);
CREATE INDEX IF NOT EXISTS notification_logs_email_idx   ON notification_logs (person_email);

-- RLS: only service role can insert; admins can read via service key on API side
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read notification_logs" ON notification_logs
  FOR SELECT USING (true);
