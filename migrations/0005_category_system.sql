-- Category Management System
-- Adds proper categories table with cafe-specific categories

-- 1. Create categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  cafe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
);

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_categories_cafe ON categories(cafe_id, is_active, sort_order);

-- 3. Seed default categories for existing cafes
-- This will be handled by application logic when cafe is created
-- For now, we'll add a script to migrate existing data

-- 4. Migrate existing menu categories to use category IDs
-- First, insert default categories for each cafe that has menu items
INSERT OR IGNORE INTO categories (id, cafe_id, name, icon, color, sort_order, is_active)
SELECT 
  'cat_' || cafe_id || '_coffee',
  cafe_id,
  'Coffee',
  '☕',
  '#92400E',
  0,
  1
FROM menu 
GROUP BY cafe_id;

INSERT OR IGNORE INTO categories (id, cafe_id, name, icon, color, sort_order, is_active)
SELECT 
  'cat_' || cafe_id || '_drink',
  cafe_id,
  'Drink',
  '🥤',
  '#0369A1',
  1,
  1
FROM menu 
WHERE category = 'Drink'
GROUP BY cafe_id;

INSERT OR IGNORE INTO categories (id, cafe_id, name, icon, color, sort_order, is_active)
SELECT 
  'cat_' || cafe_id || '_food',
  cafe_id,
  'Food',
  '🍽️',
  '#15803D',
  2,
  1
FROM menu 
WHERE category = 'Food'
GROUP BY cafe_id;

INSERT OR IGNORE INTO categories (id, cafe_id, name, icon, color, sort_order, is_active)
SELECT 
  'cat_' || cafe_id || '_snack',
  cafe_id,
  'Snack',
  '🍿',
  '#C2410C',
  3,
  1
FROM menu 
WHERE category = 'Snack'
GROUP BY cafe_id;
