-- ============================================
-- 005: Range deadlines, style due dates, task collaborators
-- ============================================

-- 1. Add deadline to ranges
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS deadline DATE;

-- 2. Add due_date to range_styles
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS due_date DATE;

-- 3. Add collaborators to tasks (array of people IDs alongside main assigned_to)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS collaborators INTEGER[] DEFAULT '{}';
