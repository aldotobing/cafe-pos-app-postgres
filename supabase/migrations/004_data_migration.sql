-- ============================================================================
-- MIGRATION: Data Migration Guide & Helper Script
-- File: 004_data_migration.sql
-- Description: SQL untuk migrasi data dari D1 SQLite ke PostgreSQL
-- ============================================================================

-- ============================================================================
-- 1. PRE-MIGRATION CHECKLIST (Jalankan di D1/Cloudflare)
-- ============================================================================

/*
Di Cloudflare Dashboard atau via wrangler CLI:

1. Export D1 data ke JSON/SQL:
   wrangler d1 export kasirku-db --output=./d1-export.sql

2. Backup current database:
   wrangler d1 backup create kasirku-db

3. Verify data counts:
   SELECT 'cafes' as table_name, COUNT(*) as count FROM cafes
   UNION ALL SELECT 'users', COUNT(*) FROM users
   UNION ALL SELECT 'menu', COUNT(*) FROM menu
   UNION ALL SELECT 'transactions', COUNT(*) FROM transactions;
*/

-- ============================================================================
-- 2. POSTGRESQL IMPORT PREPARATION
-- ============================================================================

-- Create temporary tables untuk staging data dari D1
CREATE TABLE IF NOT EXISTS _staging_d1_users (
    id TEXT PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT,
    auth_type TEXT,
    password_hash TEXT,  -- Tidak bisa digunakan di Supabase Auth
    google_id TEXT,
    is_approved INTEGER,
    is_active INTEGER,
    cafe_id INTEGER,
    created_by TEXT,
    created_at TEXT,
    last_login TEXT
);

CREATE TABLE IF NOT EXISTS _staging_d1_cafes (
    id INTEGER PRIMARY KEY,
    owner_user_id TEXT,
    address TEXT,
    phone TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT,
    version INTEGER
);

CREATE TABLE IF NOT EXISTS _staging_d1_menu (
    id TEXT PRIMARY KEY,
    cafe_id INTEGER,
    name TEXT,
    category TEXT,
    price REAL,
    available INTEGER,
    image_url TEXT,
    stock_quantity INTEGER,
    hpp_price REAL,
    margin_percent REAL,
    min_stock INTEGER,
    track_stock INTEGER,
    has_variants INTEGER,
    category_id TEXT,
    base_unit TEXT,
    conversion_factor REAL,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT,
    version INTEGER
);

-- ============================================================================
-- 3. USER MIGRATION STRATEGY (Manual Process)
-- ============================================================================

/*
⚠️ IMPORTANT: Password Hash Incompatibility

D1 menggunakan custom password hashing (mungkin bcrypt/custom) sedangkan 
Supabase Auth menggunakan GoTrue dengan bcrypt yang berbeda.

STRATEGI MIGRASI USER:

1. PRE-MIGRATION (Jalankan sebelum cutover):
   - Export email dan role dari D1
   - Kirim email ke semua user: "Kami upgrade sistem, silakan reset password"

2. USER MIGRATION SCRIPT (Node.js/Python):
   
   // Pseudo-code:
   const d1Users = await fetchD1Users();
   
   for (const user of d1Users) {
     // Create user di Supabase Auth
     const { data, error } = await supabaseAdmin.auth.admin.createUser({
       email: user.email,
       password: generateRandomPassword(), // User harus reset
       email_confirm: true,
       user_metadata: {
         full_name: user.full_name,
         role: user.role,
         cafe_id: user.cafe_id,
         migrated_from_d1: true
       }
     });
     
     if (data.user) {
       // Update profile dengan data tambahan
       await supabase.from('user_profiles').upsert({
         user_id: data.user.id,
         full_name: user.full_name,
         role: user.role,
         cafe_id: user.cafe_id,
         is_approved: user.is_approved === 1,
         last_login: user.last_login ? new Date(user.last_login) : null
       });
     }
   }

3. POST-MIGRATION:
   - User login dengan email + reset password
   - Auto-redirect ke reset password page jika migrated_from_d1=true
*/

-- ============================================================================
-- 4. DATA MIGRATION SQL (Setelah staging tables populated)
-- ============================================================================

-- Migrate Cafes (D1 Integer ID → PostgreSQL SERIAL)
INSERT INTO cafes (id, owner_user_id, address, phone, created_at, updated_at, deleted_at, version)
SELECT 
    s.id,
    (SELECT user_id FROM user_profiles up 
     JOIN _staging_d1_users u ON u.email = (
         SELECT email FROM _staging_d1_users WHERE id = s.owner_user_id
     )
     WHERE up.user_id = u.id
    ), -- Map D1 user_id ke Supabase UUID
    s.address,
    s.phone,
    COALESCE(s.created_at::TIMESTAMPTZ, NOW()),
    COALESCE(s.updated_at::TIMESTAMPTZ, NOW()),
    s.deleted_at::TIMESTAMPTZ,
    COALESCE(s.version, 1)
FROM _staging_d1_cafes s
ON CONFLICT (id) DO UPDATE SET
    owner_user_id = EXCLUDED.owner_user_id,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    updated_at = EXCLUDED.updated_at,
    deleted_at = EXCLUDED.deleted_at,
    version = EXCLUDED.version;

-- Migrate Categories (D1 Text ID → PostgreSQL UUID)
-- Note: D1 UUID tetap sebagai string, PostgreSQL akan convert
INSERT INTO categories (id, cafe_id, name, color, sort_order, is_active, created_at, updated_at, deleted_at, version)
SELECT 
    CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN id::UUID 
        ELSE uuid_generate_v4() 
    END,
    cafe_id,
    name,
    COALESCE(color, '#6B7280'),
    COALESCE(sort_order, 0),
    COALESCE(is_active, 1)::BOOLEAN,
    COALESCE(created_at::TIMESTAMPTZ, NOW()),
    COALESCE(updated_at::TIMESTAMPTZ, NOW()),
    deleted_at::TIMESTAMPTZ,
    COALESCE(version, 1)
FROM _staging_d1_categories
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at,
    version = EXCLUDED.version;

-- Migrate Menu (D1 Text ID → PostgreSQL UUID)
INSERT INTO menu (
    id, cafe_id, name, category, category_id, price, available,
    image_url, stock_quantity, hpp_price, margin_percent, min_stock,
    track_stock, has_variants, base_unit, conversion_factor,
    created_at, updated_at, deleted_at, version
)
SELECT 
    CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN id::UUID 
        ELSE uuid_generate_v4() 
    END,
    cafe_id,
    name,
    category,
    CASE 
        WHEN category_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN category_id::UUID 
        ELSE NULL 
    END,
    price,
    available::BOOLEAN,
    image_url,
    COALESCE(stock_quantity, 0),
    COALESCE(hpp_price, 0),
    COALESCE(margin_percent, 30.0),
    COALESCE(min_stock, 5),
    track_stock::BOOLEAN,
    has_variants::BOOLEAN,
    COALESCE(base_unit, 'pcs'),
    COALESCE(conversion_factor, 1.0),
    COALESCE(created_at::TIMESTAMPTZ, NOW()),
    COALESCE(updated_at::TIMESTAMPTZ, NOW()),
    deleted_at::TIMESTAMPTZ,
    COALESCE(version, 1)
FROM _staging_d1_menu
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    stock_quantity = EXCLUDED.stock_quantity,
    updated_at = EXCLUDED.updated_at,
    version = EXCLUDED.version;

-- Migrate Transactions
INSERT INTO transactions (
    id, transaction_number, subtotal, tax_amount, service_charge,
    total_amount, payment_method, payment_amount, change_amount,
    order_note, cafe_id, created_at, updated_at, deleted_at, version
)
SELECT 
    CASE 
        WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN id::UUID 
        ELSE uuid_generate_v4() 
    END,
    transaction_number,
    subtotal,
    tax_amount,
    service_charge,
    total_amount,
    payment_method::payment_method,
    payment_amount,
    COALESCE(change_amount, 0),
    order_note,
    cafe_id,
    COALESCE(created_at::TIMESTAMPTZ, NOW()),
    COALESCE(updated_at::TIMESTAMPTZ, NOW()),
    deleted_at::TIMESTAMPTZ,
    COALESCE(version, 1)
FROM _staging_d1_transactions
ON CONFLICT (transaction_number) DO UPDATE SET
    subtotal = EXCLUDED.subtotal,
    total_amount = EXCLUDED.total_amount,
    updated_at = EXCLUDED.updated_at,
    version = EXCLUDED.version;

-- Migrate Transaction Items
INSERT INTO transaction_items (
    id, transaction_id, menu_id, menu_name, variant_id, variant_name,
    price, quantity, discount, note, created_at, deleted_at, version
)
SELECT 
    uuid_generate_v4(), -- Generate new UUID untuk items
    (SELECT id FROM _staging_d1_transactions WHERE id = s.transaction_id)::UUID,
    CASE 
        WHEN menu_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN menu_id::UUID 
        ELSE NULL 
    END,
    menu_name,
    CASE 
        WHEN variant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN variant_id::UUID 
        ELSE NULL 
    END,
    variant_name,
    price,
    quantity,
    COALESCE(discount, 0),
    note,
    COALESCE(created_at::TIMESTAMPTZ, NOW()),
    deleted_at::TIMESTAMPTZ,
    COALESCE(version, 1)
FROM _staging_d1_transaction_items s;

-- ============================================================================
-- 5. POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verify counts match
SELECT 'cafes' as table_name, COUNT(*) as count FROM cafes
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'menu', COUNT(*) FROM menu
UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL SELECT 'transaction_items', COUNT(*) FROM transaction_items
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
ORDER BY table_name;

-- Check for orphaned records
SELECT 'orphaned menu (no cafe)' as check_name, COUNT(*) 
FROM menu m WHERE NOT EXISTS (SELECT 1 FROM cafes c WHERE c.id = m.cafe_id);

SELECT 'orphaned transactions (no cafe)' as check_name, COUNT(*) 
FROM transactions t WHERE NOT EXISTS (SELECT 1 FROM cafes c WHERE c.id = t.cafe_id);

SELECT 'orphaned items (no transaction)' as check_name, COUNT(*) 
FROM transaction_items ti WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.id = ti.transaction_id);

-- ============================================================================
-- 6. CLEANUP
-- ============================================================================

-- Drop staging tables setelah migrasi sukses
-- DROP TABLE IF EXISTS _staging_d1_users;
-- DROP TABLE IF EXISTS _staging_d1_cafes;
-- DROP TABLE IF EXISTS _staging_d1_categories;
-- DROP TABLE IF EXISTS _staging_d1_menu;
-- DROP TABLE IF EXISTS _staging_d1_transactions;
-- DROP TABLE IF EXISTS _staging_d1_transaction_items;

-- ============================================================================
-- 7. ROLLBACK PREPAREDNESS
-- ============================================================================

/*
Jika perlu rollback ke D1:

1. Supabase tidak bisa 100% rollback ke D1 karena schema differences
2. Strategy: Keep D1 running sebagai read-only selama cutover period
3. Dual-write pattern: Write ke Supabase dan D1 selama transition period
4. Reconcile script: Bandingkan counts setiap hari

ROLLBACK STEPS:
1. Switch DNS/API endpoint kembali ke Cloudflare Workers + D1
2. Export Supabase data ke format yang D1 bisa import
3. Import ke D1
4. Note: UUID→Integer ID mapping akan jadi issue, perlu mapping table
*/
