-- ============================================================
-- SUPABASE UPDATE V9: Task Subtasks + Entity Linking
-- ============================================================

-- 1. Task Subtasks table
CREATE TABLE IF NOT EXISTS task_subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_subtasks_task_id ON task_subtasks(task_id);

-- RLS policies
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to task_subtasks" ON task_subtasks
  FOR ALL USING (true) WITH CHECK (true);

-- 2. Entity linking columns on tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS style_id INTEGER REFERENCES styles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_style_id ON tasks(style_id);
CREATE INDEX idx_tasks_supplier_id ON tasks(supplier_id);
CREATE INDEX idx_tasks_purchase_order_id ON tasks(purchase_order_id);
