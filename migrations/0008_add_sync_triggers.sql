-- SQL Migration: Database Triggers for Automatic Sync Tracking
-- These triggers ensure that updated_at and version are always correct, 
-- even if data is modified via direct SQL or a bug in the code.

-- 1. Trigger for Menu Table
CREATE TRIGGER IF NOT EXISTS tr_menu_updated
AFTER UPDATE ON menu
FOR EACH ROW
BEGIN
  UPDATE menu 
  SET updated_at = datetime('now', '+7 hours'),
      version = OLD.version + 1
  WHERE id = OLD.id;
END;

-- 2. Trigger for Categories Table
CREATE TRIGGER IF NOT EXISTS tr_categories_updated
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
  UPDATE categories 
  SET updated_at = datetime('now', '+7 hours'),
      version = OLD.version + 1
  WHERE id = OLD.id;
END;

-- 3. Trigger for Cafe Settings Table
CREATE TRIGGER IF NOT EXISTS tr_settings_updated
AFTER UPDATE ON cafe_settings
FOR EACH ROW
BEGIN
  UPDATE cafe_settings 
  SET updated_at = datetime('now', '+7 hours'),
      version = OLD.version + 1
  WHERE id = OLD.id;
END;

-- 4. Trigger for Transactions Table
CREATE TRIGGER IF NOT EXISTS tr_transactions_updated
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
  UPDATE transactions 
  SET updated_at = datetime('now', '+7 hours'),
      version = OLD.version + 1
  WHERE id = OLD.id;
END;
