# KasirKu - Database Schema Documentation (PostgreSQL)

## 🗄️ Database Overview

KasirKu menggunakan **Supabase (PostgreSQL)** sebagai database utama. Schema ini adalah versi terbaru yang aktif digunakan, migrasi dari SQLite (Cloudflare D1) ke PostgreSQL (Supabase).

### Database Characteristics
- **Type**: PostgreSQL 15+ (via Supabase)
- **Multi-tenant**: Cafe-based data separation
- **Version Control**: Automatic version tracking untuk sync
- **Timezone**: Asia/Jakarta (WIB/UTC+7)
- **Encoding**: UTF-8
- **Extensions**: uuid-ossp, pgcrypto, pg_trgm (untuk search)

### PostgreSQL Data Types
- **UUID**: `UUID DEFAULT uuid_generate_v4()` - untuk primary keys (kecuali cafes)
- **SERIAL**: Auto-increment integer - untuk cafes.id (compatibility)
- **NUMERIC(12,2)**: Decimal dengan 2 decimal places - untuk harga dan amounts
- **TIMESTAMPTZ**: Timestamp dengan timezone - untuk timestamps
- **BOOLEAN**: True/false - untuk flags
- **ENUM**: Enumerated types - untuk payment methods, roles, mutation types
- **TEXT**: Variable-length string - untuk nama, notes
- **INTEGER**: Whole numbers - untuk quantity, stock

---

## 📋 Table Schemas

### 1. cafes

Root table untuk multi-tenant architecture. Menggunakan SERIAL untuk compatibility dengan existing IDs dari SQLite migration.

```sql
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
```

**Key Fields**:
- **id**: SERIAL auto-increment (compatibility)
- **owner_user_id**: UUID reference ke `auth.users`
- **name**: Nama cafe (NOT NULL dengan constraint)

**Indexes**:
- `idx_cafes_owner` ON cafes(owner_user_id) WHERE deleted_at IS NULL

---

### 2. user_profiles

Extended user data yang link ke `auth.users` dari Supabase Auth.

```sql
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
```

**Key Fields**:
- **user_id**: UUID primary key, references `auth.users(id)`
- **role**: ENUM ('superadmin', 'admin', 'cashier')
- **is_approved**: BOOLEAN untuk approval workflow
- **is_active**: BOOLEAN untuk activation status

**Indexes**:
- `idx_user_profiles_cafe` ON user_profiles(cafe_id) WHERE deleted_at IS NULL
- `idx_user_profiles_role` ON user_profiles(role) WHERE deleted_at IS NULL

**Notes**:
- Authentication ditangani oleh Supabase Auth (`auth.users`)
- `user_profiles` menyimpan data tambahan dan role

---

### 3. cafe_settings

Configuration dan settings untuk setiap cafe.

```sql
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
```

**Key Fields**:
- **tagline**: Slogan/tagline cafe
- **tax_percent**: NUMERIC(5,2) - Tax percentage
- **service_percent**: NUMERIC(5,2) - Service charge percentage
- **enable_push_notifications**: BOOLEAN

---

### 4. categories

Product categorization dengan UUID untuk distributed ID generation.

```sql
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
```

**Indexes**:
- `idx_categories_cafe` ON categories(cafe_id, is_active, sort_order) WHERE deleted_at IS NULL
- `idx_categories_updated` ON categories(updated_at DESC, cafe_id) WHERE deleted_at IS NULL

---

### 5. menu

Menu items dengan support stock tracking dan variants.

```sql
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
```

**Key Fields**:
- **price**: NUMERIC(12,2) - Selling price
- **hpp_price**: NUMERIC(12,2) - Harga Pokok Penjualan (cost price)
- **margin_percent**: NUMERIC(5,2) - Target margin percentage
- **track_stock**: BOOLEAN - Enable stock tracking
- **has_variants**: BOOLEAN - Has product variants
- **conversion_factor**: NUMERIC(8,2) - Unit conversion factor

**Indexes**:
- `idx_menu_cafe_category` ON menu(cafe_id, category_id) WHERE deleted_at IS NULL
- `idx_menu_stock_tracking` ON menu(cafe_id, track_stock, stock_quantity) WHERE deleted_at IS NULL
- `idx_menu_sync` ON menu(updated_at, version) WHERE deleted_at IS NULL
- `idx_menu_name_trgm` ON menu USING gin(name gin_trgm_ops) - Full text search

---

### 6. product_variants

Product variants dengan individual pricing dan stock.

```sql
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
```

**Key Fields**:
- **sku**: Stock Keeping Unit (unique)
- **barcode**: Barcode untuk scanning (unique)
- **variant_name**: Deskripsi variant (e.g., "Small", "Red")
- **price**: Variant-specific price (override parent if set)

**Indexes**:
- `idx_product_variants_menu` ON product_variants(menu_id, is_active) WHERE deleted_at IS NULL
- `idx_product_variants_sku` ON product_variants(sku) WHERE deleted_at IS NULL
- `idx_product_variants_barcode` ON product_variants(barcode) WHERE deleted_at IS NULL
- `idx_product_variants_stock` ON product_variants(menu_id, track_stock, stock_quantity) WHERE deleted_at IS NULL

---

### 7. variant_attributes

Variant attribute definitions (Size, Color, etc.).

```sql
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
```

---

### 8. variant_attribute_values

Values untuk variant attributes (Large, Medium, Red, Blue, etc.).

```sql
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
```

---

### 9. variant_attribute_mappings

Junction table: Variants ↔ Attribute Values.

```sql
CREATE TABLE variant_attribute_mappings (
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    attribute_value_id UUID NOT NULL REFERENCES variant_attribute_values(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (variant_id, attribute_value_id)
);
```

---

### 10. transactions

Transaction records untuk sales dengan ENUM payment_method.

```sql
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
```

**Key Fields**:
- **payment_method**: ENUM ('Tunai', 'QRIS', 'Debit', 'Transfer')
- **cashier_name**: Nama cashier untuk display
- **created_by**: UUID reference ke `auth.users`

**Indexes**:
- `idx_transactions_cafe_created` ON transactions(cafe_id, created_at DESC) WHERE deleted_at IS NULL
- `idx_transactions_created_by` ON transactions(created_by) WHERE deleted_at IS NULL
- `idx_transactions_number` ON transactions(transaction_number)
- `idx_transactions_sync` ON transactions(updated_at, version) WHERE deleted_at IS NULL

---

### 11. transaction_items

Line items dalam transactions.

```sql
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
```

**Indexes**:
- `idx_transaction_items_txid` ON transaction_items(transaction_id)
- `idx_transaction_items_menu` ON transaction_items(menu_id) WHERE deleted_at IS NULL

---

### 12. stock_mutations

Audit trail untuk stock changes.

```sql
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
```

**Mutation Types**:
- **in**: Stock increase (restock, purchase)
- **out**: Stock decrease (transaction)
- **adjustment**: Manual adjustment
- **opname**: Physical count adjustment

**Indexes**:
- `idx_stock_mutations_menu` ON stock_mutations(menu_id)
- `idx_stock_mutations_cafe` ON stock_mutations(cafe_id, created_at DESC)
- `idx_stock_mutations_reference` ON stock_mutations(reference_type, reference_id)

---

### 13. push_subscriptions

Web push notification subscriptions.

```sql
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
```

**Indexes**:
- `idx_push_subscriptions_user` ON push_subscriptions(user_id) WHERE deleted_at IS NULL
- `idx_push_subscriptions_cafe` ON push_subscriptions(cafe_id) WHERE deleted_at IS NULL

---

## 🔗 Relationships

### Entity Relationship Diagram

```
cafes (1) ──────< (N) user_profiles (via cafe_id)
  │                     │
  │                     ├─ (N) transactions (created_by)
  │                     └─ (N) stock_mutations (created_by)
  │
  ├─ (1) cafe_settings
  │
  ├─ (N) menu
  │     │
  │     ├─ (N) product_variants
  │     │     │
  │     │     └─ (N) variant_attribute_mappings
  │     │
  │     ├─ (N) transaction_items
  │     │
  │     └─ (N) stock_mutations
  │
  ├─ (N) categories
  │     └─ (N) menu
  │
  └─ (N) transactions
        │
        └─ (N) transaction_items

user_profiles (1) ──────< (N) push_subscriptions (via user_id)

auth.users (1) ──────< (1) user_profiles (via user_id)
```

---

## 🎯 Constraints

### Foreign Key Constraints
- `cafe_settings.cafe_id → cafes.id` (CASCADE)
- `categories.cafe_id → cafes.id` (CASCADE)
- `menu.cafe_id → cafes.id` (CASCADE)
- `menu.category_id → categories.id` (SET NULL)
- `product_variants.menu_id → menu.id` (CASCADE)
- `variant_attributes.cafe_id → cafes.id` (CASCADE)
- `variant_attribute_values.attribute_id → variant_attributes.id` (CASCADE)
- `variant_attribute_mappings.variant_id → product_variants.id` (CASCADE)
- `variant_attribute_mappings.attribute_value_id → variant_attribute_values.id` (CASCADE)
- `transactions.cafe_id → cafes.id` (CASCADE)
- `transactions.created_by → auth.users.id` (SET NULL)
- `transaction_items.transaction_id → transactions.id` (CASCADE)
- `transaction_items.menu_id → menu.id` (SET NULL)
- `transaction_items.variant_id → product_variants.id` (SET NULL)
- `stock_mutations.menu_id → menu.id` (CASCADE)
- `stock_mutations.cafe_id → cafes.id` (CASCADE)
- `stock_mutations.variant_id → product_variants.id` (CASCADE)
- `stock_mutations.created_by → auth.users.id` (SET NULL)
- `push_subscriptions.user_id → auth.users.id` (CASCADE)
- `push_subscriptions.cafe_id → cafes.id` (CASCADE)
- `user_profiles.user_id → auth.users.id` (CASCADE)
- `user_profiles.cafe_id → cafes.id` (SET NULL)
- `user_profiles.created_by → auth.users.id` (SET NULL)
- `cafes.owner_user_id → auth.users.id` (CASCADE)

### Unique Constraints
- `product_variants.sku`
- `product_variants.barcode`
- `transactions.transaction_number`
- `push_subscriptions.endpoint`

### Check Constraints
- `cafes.check_name_not_empty`
- `categories.check_category_name`
- `menu.check_menu_name`
- `menu.check_price_positive`
- `menu.check_stock_positive`
- `product_variants.check_variant_stock_positive`
- `transactions.check_positive_amounts`
- `transaction_items.check_positive_quantity`
- `transaction_items.check_non_negative_discount`

---

## 📊 Views

### v_products_with_variants

```sql
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
```

### v_variant_details

```sql
CREATE VIEW v_variant_details AS
SELECT 
    pv.id AS variant_id,
    pv.menu_id,
    pv.sku,
    pv.barcode,
    pv.variant_name,
    pv.price AS variant_price,
    pv.stock_quantity,
    m.name AS product_name,
    m.price AS product_base_price,
    COALESCE(pv.price, m.price) AS effective_price,
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
WHERE pv.deleted_at IS NULL;
```

---

## 🗂️ Migration File

Schema ini didefinisikan di file:
- **File**: `supabase/migrations/001_initial_schema.sql`
- **Deskripsi**: Cloudflare D1 → Supabase PostgreSQL migration
- **Extensions**: uuid-ossp, pgcrypto

---

## 📝 Perbedaan dengan SQLite (Lama)

| Aspek | SQLite (Lama) | PostgreSQL (Baru) |
|-------|---------------|---------------------|
| **Primary Keys** | TEXT (UUID manual) | UUID DEFAULT uuid_generate_v4() |
| **Cafe ID** | INTEGER | SERIAL |
| **Timestamps** | TEXT (ISO string) | TIMESTAMPTZ |
| **Booleans** | INTEGER (0/1) | BOOLEAN |
| **Decimals** | REAL | NUMERIC(12,2) |
| **Users** | users table (standalone) | user_profiles extends auth.users |
| **Enums** | CHECK constraints | CREATE TYPE ENUM |
| **Extensions** | - | uuid-ossp, pgcrypto |

---

## ✅ Status

**Schema ini adalah versi aktif yang digunakan di production.**

**File**: `supabase/migrations/001_initial_schema.sql`
