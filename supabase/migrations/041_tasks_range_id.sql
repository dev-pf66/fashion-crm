-- Add range_id to tasks so tasks can be linked to a range (used by TaskForm and TASK_SELECT)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS range_id INTEGER REFERENCES ranges(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_range_id ON tasks(range_id);
