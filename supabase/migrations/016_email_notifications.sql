-- Phase 7: Email notification preferences
ALTER TABLE people ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;
