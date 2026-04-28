-- Execute this AFTER running 0001
CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(updated_at, version);
CREATE INDEX IF NOT EXISTS idx_menu_sync ON menu(updated_at, version);
