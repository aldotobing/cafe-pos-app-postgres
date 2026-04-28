-- Add category_id column to menu table for proper category relationships
ALTER TABLE menu ADD COLUMN category_id TEXT;

-- Add index for faster category-based queries
CREATE INDEX IF NOT EXISTS idx_menu_category ON menu(category_id);

-- Create foreign key constraint (documentation only, SQLite ALTER TABLE doesn't support FK via ALTER)
-- FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
