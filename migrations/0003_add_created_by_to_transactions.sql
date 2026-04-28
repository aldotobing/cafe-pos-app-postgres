-- Add created_by column to transactions for multi-user POS tracking
-- This allows us to track which user (cashier/admin) created each transaction

ALTER TABLE transactions ADD COLUMN created_by TEXT;

-- Add index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- Create composite index for cafe + user queries (common filter pattern)
CREATE INDEX IF NOT EXISTS idx_transactions_cafe_user ON transactions(cafe_id, created_by);

-- Optional: Add foreign key constraint (D1 doesn't support ALTER TABLE with FK, so this is documentation)
-- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
