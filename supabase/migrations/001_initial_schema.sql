-- ============================================================================
-- MIGRATION: Cloudflare D1 → Supabase PostgreSQL
-- File: 001_initial_schema.sql
-- Description: Core tables dengan PostgreSQL best practices
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone untuk Indonesia (WIB)
SET TIMEZONE = 'Asia/Jakarta';

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Cafes (Pertahankan SERIAL untuk compatibility dengan existing IDs)
CREATE TABLE cafes (
    id SERIAL PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    CONSTRAINT check_name_not_empty CHECK (name <> '')
);

-- Cafe Settings
CREATE TABLE cafe_settings (
    id SERIAL PRIMARY KEY,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'KasirKu Cafe',
    tagline TEXT,
    address TEXT,
    phone TEXT,
    logo_url TEXT,
    tax_percent NUMERIC(5,2) DEFAULT 10.0,
    service_percent NUMERIC(5,2) DEFAULT 5.0,
    currency TEXT DEFAULT 'IDR',
    enable_push_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);

-- Categories (UUID PK untuk distributed ID generation)
CREATE TABLE categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    CONSTRAINT check_category_name CHECK (name <> '')
);

-- Menu Items
CREATE TABLE menu (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    price NUMERIC(12,2) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    stock_quantity INTEGER DEFAULT 0,
    hpp_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    margin_percent NUMERIC(5,2) DEFAULT 30.0,
    min_stock INTEGER DEFAULT 5,
    track_stock BOOLEAN DEFAULT FALSE,
    has_variants BOOLEAN DEFAULT FALSE,
    base_unit TEXT DEFAULT 'pcs',
    conversion_factor NUMERIC(8,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    CONSTRAINT check_menu_name CHECK (name <> ''),
    CONSTRAINT check_price_positive CHECK (price >= 0),
    CONSTRAINT check_stock_positive CHECK (stock_quantity >= 0)
);

-- Product Variants
CREATE TABLE product_variants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES menu(id) ON DELETE CASCADE,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    variant_name TEXT NOT NULL,
    price NUMERIC(12,2),
    hpp_price NUMERIC(12,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    track_stock BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    CONSTRAINT check_variant_stock_positive CHECK (stock_quantity >= 0)
);

-- Variant Attributes (e.g., "Size", "Color")
CREATE TABLE variant_attributes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);

-- Variant Attribute Values (e.g., "Large", "Medium", "Red")
CREATE TABLE variant_attribute_values (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    attribute_id UUID NOT NULL REFERENCES variant_attributes(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);

-- Junction table: Variants ↔ Attribute Values
CREATE TABLE variant_attribute_mappings (
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    attribute_value_id UUID NOT NULL REFERENCES variant_attribute_values(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (variant_id, attribute_value_id)
);

-- ============================================================================
-- 2. TRANSACTION TABLES
-- ============================================================================

CREATE TYPE payment_method AS ENUM ('Tunai', 'QRIS', 'Debit', 'Transfer');

CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_number TEXT UNIQUE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL,
    service_charge NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    payment_amount NUMERIC(12,2) NOT NULL,
    change_amount NUMERIC(12,2) DEFAULT 0,
    order_note TEXT,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    cashier_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    CONSTRAINT check_positive_amounts CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        service_charge >= 0 AND 
        total_amount >= 0 AND
        payment_amount >= 0
    )
);

CREATE TABLE transaction_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES menu(id) ON DELETE SET NULL,
    menu_name TEXT NOT NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    variant_name TEXT,
    price NUMERIC(12,2) NOT NULL,
    quantity INTEGER NOT NULL,
    discount NUMERIC(12,2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    CONSTRAINT check_positive_quantity CHECK (quantity > 0),
    CONSTRAINT check_non_negative_discount CHECK (discount >= 0)
);

-- ============================================================================
-- 3. STOCK MANAGEMENT
-- ============================================================================

CREATE TYPE stock_mutation_type AS ENUM ('in', 'out', 'adjustment', 'opname');

CREATE TABLE stock_mutations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES menu(id) ON DELETE CASCADE,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    type stock_mutation_type NOT NULL,
    quantity INTEGER NOT NULL,
    hpp_price NUMERIC(12,2),
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. NOTIFICATIONS & SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE push_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    UNIQUE(endpoint)
);

-- ============================================================================
-- 5. USER PROFILES (extends auth.users)
-- ============================================================================

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'cashier');

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'admin',
    cafe_id INTEGER REFERENCES cafes(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    trial_start_date DATE,
    trial_end_date DATE,
    trial_ended_notified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- Cafe indexes
CREATE INDEX idx_cafes_owner ON cafes(owner_user_id) WHERE deleted_at IS NULL;

-- Categories indexes
CREATE INDEX idx_categories_cafe ON categories(cafe_id, is_active, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_updated ON categories(updated_at DESC, cafe_id) WHERE deleted_at IS NULL;

-- Menu indexes
CREATE INDEX idx_menu_cafe_category ON menu(cafe_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_stock_tracking ON menu(cafe_id, track_stock, stock_quantity) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_sync ON menu(updated_at, version) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_name_trgm ON menu USING gin(name gin_trgm_ops); -- Requires pg_trgm

-- Product variants indexes
CREATE INDEX idx_product_variants_menu ON product_variants(menu_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_variants_sku ON product_variants(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode) WHERE deleted_at IS NULL;
CREATE INDEX idx_product_variants_stock ON product_variants(menu_id, track_stock, stock_quantity) WHERE deleted_at IS NULL;

-- Transactions indexes
CREATE INDEX idx_transactions_cafe_created ON transactions(cafe_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_created_by ON transactions(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_sync ON transactions(updated_at, version) WHERE deleted_at IS NULL;

-- Transaction items indexes
CREATE INDEX idx_transaction_items_txid ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_menu ON transaction_items(menu_id) WHERE deleted_at IS NULL;

-- Stock mutations indexes
CREATE INDEX idx_stock_mutations_menu ON stock_mutations(menu_id);
CREATE INDEX idx_stock_mutations_cafe ON stock_mutations(cafe_id, created_at DESC);
CREATE INDEX idx_stock_mutations_reference ON stock_mutations(reference_type, reference_id);

-- User profiles indexes
CREATE INDEX idx_user_profiles_cafe ON user_profiles(cafe_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_profiles_role ON user_profiles(role) WHERE deleted_at IS NULL;

-- Push subscriptions indexes
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_push_subscriptions_cafe ON push_subscriptions(cafe_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 7. VIEWS (untuk compatibility dengan D1 views)
-- ============================================================================

-- Products with variants summary
CREATE VIEW v_products_with_variants AS
SELECT 
    m.id AS menu_id,
    m.name AS product_name,
    m.category_id,
    m.price AS base_price,
    m.has_variants,
    COUNT(pv.id) AS variant_count,
    COALESCE(SUM(
        CASE WHEN pv.track_stock THEN pv.stock_quantity ELSE 0 END
    ), 0) AS total_variant_stock
FROM menu m
LEFT JOIN product_variants pv ON pv.menu_id = m.id AND pv.deleted_at IS NULL
WHERE m.deleted_at IS NULL
GROUP BY m.id;

-- Variant details with attributes (PostgreSQL version tanpa GROUP_CONCAT)
CREATE OR REPLACE VIEW v_variant_details AS
SELECT 
    pv.id AS variant_id,
    pv.menu_id,
    pv.sku,
    pv.barcode,
    pv.variant_name,
    pv.price AS variant_price,
    pv.stock_quantity,
    pv.is_active,
    pv.track_stock,
    pv.min_stock,
    m.name AS product_name,
    m.price AS product_base_price,
    COALESCE(pv.price, m.price) AS effective_price,
    -- Attributes sebagai JSON array (bukan string concatenated)
    (
        SELECT json_agg(json_build_object(
            'name', va.name,
            'value', vav.value
        ))
        FROM variant_attribute_mappings vam
        JOIN variant_attribute_values vav ON vav.id = vam.attribute_value_id
        JOIN variant_attributes va ON va.id = vav.attribute_id
        WHERE vam.variant_id = pv.id
    ) AS attributes
FROM product_variants pv
JOIN menu m ON m.id = pv.menu_id
WHERE pv.deleted_at IS NULL 
  AND m.deleted_at IS NULL;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE cafes IS 'Master data untuk setiap cafe/restaurant';
COMMENT ON TABLE menu IS 'Menu items dengan support stock tracking dan variants';
COMMENT ON TABLE transactions IS 'Header transaksi dengan payment details';
COMMENT ON TABLE user_profiles IS 'Extended user data yang link ke auth.users';
COMMENT ON COLUMN menu.hpp_price IS 'Harga Pokok Penjualan - cost price untuk margin calculation';
COMMENT ON COLUMN menu.margin_percent IS 'Target margin percentage untuk pricing guidance';
