-- Stock System Migration for POS Inventory
-- Adds stock tracking, HPP (COGS), and stock mutation history

-- 1. Add stock fields to menu table
ALTER TABLE menu ADD COLUMN stock_quantity INTEGER DEFAULT 0;
ALTER TABLE menu ADD COLUMN hpp_price REAL NOT NULL DEFAULT 0;
ALTER TABLE menu ADD COLUMN min_stock INTEGER DEFAULT 5;
ALTER TABLE menu ADD COLUMN track_stock INTEGER DEFAULT 0;

-- 2. Create stock_mutations table (riwayat pergerakan stok)
CREATE TABLE stock_mutations (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL,
  cafe_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('in', 'out', 'adjustment', 'opname')) NOT NULL,
  quantity INTEGER NOT NULL,
  hpp_price REAL,
  reference_type TEXT, -- 'purchase', 'transaction', 'adjustment', 'opname'
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE CASCADE,
  FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_mutations_menu ON stock_mutations(menu_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_cafe ON stock_mutations(cafe_id);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_type ON stock_mutations(type, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_mutations_reference ON stock_mutations(reference_type, reference_id);

-- 4. Index for menu stock queries
CREATE INDEX IF NOT EXISTS idx_menu_stock_tracking ON menu(cafe_id, track_stock, stock_quantity);

-- 5. Add helpful comments for documentation (optional, SQLite doesn't support comments on columns)
-- stock_quantity: Current available stock
-- hpp_price: Harga Pokok Penjualan (COGS) per unit
-- min_stock: Minimum stock threshold for alerts
-- track_stock: Enable/disable stock tracking (0=disabled, 1=enabled)
-- type: 'in'=stock in, 'out'=stock out, 'adjustment'=manual adjust, 'opname'=stock take
-- reference_type: What triggered this mutation ('purchase', 'transaction', 'adjustment', 'opname')
