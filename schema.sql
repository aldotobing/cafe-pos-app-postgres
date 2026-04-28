CREATE TABLE _cf_KV (key TEXT PRIMARY KEY, value BLOB) WITHOUT ROWID CREATE TRIGGER tr_settings_updated
AFTER
UPDATE ON cafe_settings FOR EACH ROW BEGIN
UPDATE cafe_settings
SET updated_at = datetime('now', '+7 hours'),
  version = OLD.version + 1
WHERE id = OLD.id;
END CREATE TABLE "cafe_settings" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cafe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  tax_percent REAL DEFAULT 10.0,
  service_percent REAL DEFAULT 5.0,
  currency TEXT DEFAULT 'IDR',
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  enable_push_notifications INTEGER DEFAULT 0,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
) CREATE INDEX idx_cafe_settings_updated ON cafe_settings(updated_at DESC, cafe_id, deleted_at) CREATE TABLE "cafes" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  deleted_at TEXT,
  version INTEGER DEFAULT 1
) CREATE TRIGGER tr_categories_updated
AFTER
UPDATE ON categories FOR EACH ROW BEGIN
UPDATE categories
SET updated_at = datetime('now', '+7 hours'),
  version = OLD.version + 1
WHERE id = OLD.id;
END CREATE TABLE categories (
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
) CREATE INDEX idx_categories_cafe ON categories(cafe_id, is_active, sort_order) CREATE INDEX idx_categories_updated ON categories(updated_at DESC, cafe_id, deleted_at) CREATE TRIGGER tr_menu_updated
AFTER
UPDATE ON menu FOR EACH ROW BEGIN
UPDATE menu
SET updated_at = datetime('now', '+7 hours'),
  version = OLD.version + 1
WHERE id = OLD.id;
END CREATE TABLE "menu" (
  id TEXT PRIMARY KEY,
  cafe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  available INTEGER DEFAULT 1,
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  stock_quantity INTEGER DEFAULT 0,
  hpp_price REAL NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  track_stock INTEGER DEFAULT 0,
  category_id TEXT,
  margin_percent REAL DEFAULT 30.0,
  has_variants INTEGER DEFAULT 0,
  base_unit TEXT DEFAULT 'pcs',
  conversion_factor REAL DEFAULT 1,
  FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
) CREATE INDEX idx_menu_category ON menu(category_id) CREATE INDEX idx_menu_stock_tracking ON menu(cafe_id, track_stock, stock_quantity) CREATE INDEX idx_menu_sync ON menu(updated_at, version) CREATE INDEX idx_menu_updated ON menu(updated_at DESC, cafe_id, deleted_at) CREATE TRIGGER tr_product_variants_updated
AFTER
UPDATE ON product_variants FOR EACH ROW BEGIN
UPDATE product_variants
SET updated_at = datetime('now', '+7 hours'),
  version = OLD.version + 1
WHERE id = OLD.id;
END CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  variant_name TEXT NOT NULL,
  price REAL,
  hpp_price REAL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  track_stock INTEGER DEFAULT 0,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE CASCADE
) CREATE INDEX idx_product_variants_barcode ON product_variants(barcode) CREATE INDEX idx_product_variants_menu ON product_variants(menu_id, is_active) CREATE INDEX idx_product_variants_menu_active ON product_variants(menu_id, deleted_at, is_active) CREATE INDEX idx_product_variants_sku ON product_variants(sku) CREATE INDEX idx_product_variants_stock ON product_variants(menu_id, track_stock, stock_quantity) CREATE INDEX idx_product_variants_updated ON product_variants(updated_at DESC, menu_id, deleted_at) CREATE TABLE push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cafe_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CREATE TABLE sqlite_sequence(name, seq) CREATE TABLE stock_mutations (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL,
  cafe_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('in', 'out', 'adjustment', 'opname')) NOT NULL,
  quantity INTEGER NOT NULL,
  hpp_price REAL,
  reference_type TEXT,
  -- 'purchase', 'transaction', 'adjustment', 'opname' reference_id TEXT, notes TEXT, created_by TEXT, created_at TEXT DEFAULT (datetime('now', '+7 hours')), variant_id TEXT, FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE CASCADE, FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE )
  CREATE INDEX idx_stock_mutations_menu ON stock_mutations(menu_id) CREATE INDEX idx_stock_mutations_reference ON stock_mutations(reference_type, reference_id) CREATE INDEX idx_stock_mutations_type ON stock_mutations(type, created_at) CREATE TABLE "transaction_items" (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    menu_id TEXT,
    menu_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    discount REAL DEFAULT 0,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now', '+7 hours')),
    deleted_at TEXT,
    version INTEGER DEFAULT 1,
    variant_id TEXT,
    variant_name TEXT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE
    SET NULL
  ) CREATE INDEX idx_transaction_items_txid ON transaction_items(transaction_id, menu_id, quantity) CREATE TRIGGER tr_transactions_updated
  AFTER
  UPDATE ON transactions FOR EACH ROW BEGIN
  UPDATE transactions
  SET updated_at = datetime('now', '+7 hours'),
    version = OLD.version + 1
  WHERE id = OLD.id;
END CREATE TABLE "transactions" (
  id TEXT PRIMARY KEY,
  transaction_number TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL,
  tax_amount REAL NOT NULL,
  service_charge REAL NOT NULL,
  total_amount REAL NOT NULL,
  payment_method TEXT CHECK(
    payment_method IN ('Tunai', 'QRIS', 'Debit', 'Transfer')
  ) NOT NULL,
  payment_amount REAL NOT NULL,
  change_amount REAL DEFAULT 0,
  order_note TEXT,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  cafe_id INTEGER DEFAULT 1,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  created_by TEXT
) CREATE INDEX idx_transactions_cafe_user ON transactions(cafe_id, created_by) CREATE INDEX idx_transactions_created_by ON transactions(created_by) CREATE INDEX idx_transactions_sync ON transactions(updated_at, version) CREATE TABLE user_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
) CREATE TABLE "users" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT CHECK(role IN ('superadmin', 'admin', 'cashier')) NOT NULL DEFAULT 'admin',
  auth_type TEXT CHECK(auth_type IN ('google', 'email_password')) NOT NULL DEFAULT 'email_password',
  password_hash TEXT,
  google_id TEXT UNIQUE,
  is_approved INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  trial_start_date TEXT,
  trial_end_date TEXT,
  trial_ended_notified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  last_login TEXT,
  created_by TEXT,
  cafe_id INTEGER,
  deleted_at TEXT,
  version INTEGER DEFAULT 1
) CREATE INDEX idx_users_sync ON users(updated_at, version) CREATE VIEW v_products_with_variants AS
SELECT m.id as menu_id,
  m.name as product_name,
  m.category_id,
  m.price as base_price,
  m.has_variants,
  COUNT(pv.id) as variant_count,
  SUM(
    CASE
      WHEN pv.track_stock = 1 THEN pv.stock_quantity
      ELSE 0
    END
  ) as total_variant_stock
FROM menu m
  LEFT JOIN product_variants pv ON pv.menu_id = m.id
  AND pv.deleted_at IS NULL
WHERE m.deleted_at IS NULL
GROUP BY m.id CREATE VIEW v_variant_details AS
SELECT pv.id as variant_id,
  pv.menu_id,
  pv.sku,
  pv.barcode,
  pv.variant_name,
  pv.price as variant_price,
  pv.stock_quantity,
  m.name as product_name,
  m.price as product_base_price,
  COALESCE(pv.price, m.price) as effective_price,
  GROUP_CONCAT(va.name || ':' || vav.value, ', ') as attributes
FROM product_variants pv
  JOIN menu m ON m.id = pv.menu_id
  LEFT JOIN variant_attribute_mappings vam ON vam.variant_id = pv.id
  LEFT JOIN variant_attribute_values vav ON vav.id = vam.attribute_value_id
  LEFT JOIN variant_attributes va ON va.id = vav.attribute_id
WHERE pv.deleted_at IS NULL
GROUP BY pv.id CREATE TABLE variant_attribute_mappings (
    variant_id TEXT NOT NULL,
    attribute_value_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', '+7 hours')),
    PRIMARY KEY (variant_id, attribute_value_id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_value_id) REFERENCES variant_attribute_values(id) ON DELETE CASCADE
  ) CREATE INDEX idx_variant_mappings_value ON variant_attribute_mappings(attribute_value_id) CREATE TRIGGER tr_variant_values_updated
AFTER
UPDATE ON variant_attribute_values FOR EACH ROW BEGIN
UPDATE variant_attribute_values
SET updated_at = datetime('now', '+7 hours'),
  version = OLD.version + 1
WHERE id = OLD.id;
END CREATE TABLE variant_attribute_values (
  id TEXT PRIMARY KEY,
  attribute_id TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (attribute_id) REFERENCES variant_attributes(id) ON DELETE CASCADE
) CREATE INDEX idx_variant_values_attribute ON variant_attribute_values(attribute_id, is_active, sort_order) CREATE INDEX idx_variant_values_updated ON variant_attribute_values(updated_at DESC, deleted_at) CREATE TRIGGER tr_variant_attributes_updated
AFTER
UPDATE ON variant_attributes FOR EACH ROW BEGIN
UPDATE variant_attributes
SET updated_at = datetime('now', '+7 hours'),
  version = OLD.version + 1
WHERE id = OLD.id;
END CREATE TABLE variant_attributes (
  id TEXT PRIMARY KEY,
  cafe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', '+7 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+7 hours')),
  deleted_at TEXT,
  version INTEGER DEFAULT 1,
  FOREIGN KEY (cafe_id) REFERENCES cafes(id) ON DELETE CASCADE
) CREATE INDEX idx_variant_attributes_cafe ON variant_attributes(cafe_id, is_active, sort_order) CREATE INDEX idx_variant_attributes_updated ON variant_attributes(updated_at DESC, cafe_id, deleted_at)