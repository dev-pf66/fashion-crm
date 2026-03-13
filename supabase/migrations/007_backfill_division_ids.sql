-- Randomly assign tasks with NULL division_id to an existing division
UPDATE tasks
SET division_id = (
  SELECT id FROM divisions ORDER BY random() LIMIT 1
)
WHERE division_id IS NULL;

-- Randomly assign ranges with NULL division_id to an existing division
UPDATE ranges
SET division_id = (
  SELECT id FROM divisions ORDER BY random() LIMIT 1
)
WHERE division_id IS NULL;
