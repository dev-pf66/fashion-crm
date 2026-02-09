-- =============================================================================
-- Fashion CRM - Migration v6: Tagging and Notifications
-- =============================================================================
-- This migration:
--   1. Drops and recreates the `comments` table with correct FK types
--      (person_id as INTEGER to match people.id, entity_id as TEXT for flexibility)
--   2. Drops and recreates the `notifications` table for in-app notifications
--      triggered by mentions, comments, and status changes
--
-- NOTE: The original comments table from v3 used UUID person_id which is
-- incompatible with the people table's INTEGER primary key. This migration
-- fixes that by recreating the table with the correct column types.
--
-- This migration is re-runnable (uses DROP TABLE IF EXISTS).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Comments table
-- ---------------------------------------------------------------------------
-- Drop the existing (likely broken) comments table from v3 that used UUID
-- person_id instead of INTEGER to reference people.id
DROP TABLE IF EXISTS comments;

CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,        -- 'range_style', 'style', 'sample', 'purchase_order', 'supplier'
  entity_id TEXT NOT NULL,          -- UUID stored as text for flexibility across entity types
  person_id INTEGER REFERENCES people(id),
  content TEXT NOT NULL,
  mentions INTEGER[] DEFAULT '{}',  -- array of people IDs mentioned in the comment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON comments
  FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. Notifications table
-- ---------------------------------------------------------------------------
-- Drop first to make the migration re-runnable, then recreate
DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,               -- 'mention', 'comment', 'status_change'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,                        -- URL path to navigate to, e.g. '/range-planning/uuid'
  from_person_id INTEGER REFERENCES people(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_person ON notifications(person_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON notifications
  FOR ALL USING (true) WITH CHECK (true);
