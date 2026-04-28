-- ============================================================================
-- MIGRATION: Row Level Security Policies
-- File: 002_rls_policies.sql
-- Description: Granular access control (Cafe-scoped + Role-based)
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_attribute_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (
        SELECT role FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current user's cafe_id
CREATE OR REPLACE FUNCTION get_current_user_cafe()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT cafe_id FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user belongs to a cafe
CREATE OR REPLACE FUNCTION user_belongs_to_cafe(cafe_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND cafe_id = $1
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all cafe_ids where user is a member
CREATE OR REPLACE FUNCTION get_user_cafe_ids()
RETURNS TABLE(cafe_id INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT up.cafe_id 
    FROM user_profiles up
    WHERE up.user_id = auth.uid() 
    AND up.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. POLICIES: CAFES
-- ============================================================================

-- Superadmin: Full access to all cafes
CREATE POLICY cafes_superadmin_all ON cafes
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Owner: Full access to own cafes
CREATE POLICY cafes_owner_all ON cafes
    FOR ALL TO authenticated
    USING (owner_user_id = auth.uid());

-- Admin/Cashier: Read-only access to their cafe
CREATE POLICY cafes_staff_read ON cafes
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() IN ('admin', 'cashier')
        AND user_belongs_to_cafe(id)
    );

-- Allow insert untuk user yang ingin create cafe (jadi owner)
CREATE POLICY cafes_insert_owner ON cafes
    FOR INSERT TO authenticated
    WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- 4. POLICIES: CAFE_SETTINGS
-- ============================================================================

-- Superadmin: Full access
CREATE POLICY cafe_settings_superadmin_all ON cafe_settings
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Admin: Full access to their cafe settings
CREATE POLICY cafe_settings_admin_all ON cafe_settings
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND user_belongs_to_cafe(cafe_id)
    );

-- Cashier: Read-only access
CREATE POLICY cafe_settings_cashier_read ON cafe_settings
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND user_belongs_to_cafe(cafe_id)
    );

-- ============================================================================
-- 5. POLICIES: CATEGORIES
-- ============================================================================

-- Superadmin: Full access
CREATE POLICY categories_superadmin_all ON categories
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Admin: Full access to their cafe
CREATE POLICY categories_admin_all ON categories
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND user_belongs_to_cafe(cafe_id)
    );

-- Cashier: Read-only
CREATE POLICY categories_cashier_read ON categories
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND user_belongs_to_cafe(cafe_id)
    );

-- ============================================================================
-- 6. POLICIES: MENU
-- ============================================================================

-- Superadmin: Full access
CREATE POLICY menu_superadmin_all ON menu
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Admin: Full access to their cafe
CREATE POLICY menu_admin_all ON menu
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND user_belongs_to_cafe(cafe_id)
    );

-- Cashier: Read-only (needed for POS)
CREATE POLICY menu_cashier_read ON menu
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND user_belongs_to_cafe(cafe_id)
    );

-- ============================================================================
-- 7. POLICIES: PRODUCT_VARIANTS
-- ============================================================================

-- Superadmin: Full access
CREATE POLICY product_variants_superadmin_all ON product_variants
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Admin: Full access (via menu ownership)
CREATE POLICY product_variants_admin_all ON product_variants
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM menu 
            WHERE menu.id = product_variants.menu_id
            AND user_belongs_to_cafe(menu.cafe_id)
        )
    );

-- Cashier: Read-only
CREATE POLICY product_variants_cashier_read ON product_variants
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND EXISTS (
            SELECT 1 FROM menu 
            WHERE menu.id = product_variants.menu_id
            AND user_belongs_to_cafe(menu.cafe_id)
        )
    );

-- ============================================================================
-- 8. POLICIES: VARIANT_ATTRIBUTES
-- ============================================================================

CREATE POLICY variant_attributes_superadmin_all ON variant_attributes
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

CREATE POLICY variant_attributes_admin_all ON variant_attributes
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND user_belongs_to_cafe(cafe_id)
    );

CREATE POLICY variant_attributes_cashier_read ON variant_attributes
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND user_belongs_to_cafe(cafe_id)
    );

-- ============================================================================
-- 9. POLICIES: VARIANT_ATTRIBUTE_VALUES
-- ============================================================================

CREATE POLICY variant_values_superadmin_all ON variant_attribute_values
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

CREATE POLICY variant_values_admin_all ON variant_attribute_values
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM variant_attributes va
            WHERE va.id = variant_attribute_values.attribute_id
            AND user_belongs_to_cafe(va.cafe_id)
        )
    );

CREATE POLICY variant_values_cashier_read ON variant_attribute_values
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND EXISTS (
            SELECT 1 FROM variant_attributes va
            WHERE va.id = variant_attribute_values.attribute_id
            AND user_belongs_to_cafe(va.cafe_id)
        )
    );

-- ============================================================================
-- 10. POLICIES: VARIANT_ATTRIBUTE_MAPPINGS
-- ============================================================================

-- Admin/Owner access via variant ownership chain
CREATE POLICY variant_mappings_admin_all ON variant_attribute_mappings
    FOR ALL TO authenticated
    USING (
        get_current_user_role() IN ('superadmin', 'admin')
        AND EXISTS (
            SELECT 1 FROM product_variants pv
            JOIN menu m ON m.id = pv.menu_id
            WHERE pv.id = variant_attribute_mappings.variant_id
            AND (
                get_current_user_role() = 'superadmin'
                OR user_belongs_to_cafe(m.cafe_id)
            )
        )
    );

-- Cashier: Read-only
CREATE POLICY variant_mappings_cashier_read ON variant_attribute_mappings
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND EXISTS (
            SELECT 1 FROM product_variants pv
            JOIN menu m ON m.id = pv.menu_id
            WHERE pv.id = variant_attribute_mappings.variant_id
            AND user_belongs_to_cafe(m.cafe_id)
        )
    );

-- ============================================================================
-- 11. POLICIES: TRANSACTIONS
-- ============================================================================

-- Superadmin: Full access
CREATE POLICY transactions_superadmin_all ON transactions
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Admin: Full access to their cafe transactions
CREATE POLICY transactions_admin_all ON transactions
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND user_belongs_to_cafe(cafe_id)
    );

-- Cashier: Create + Read own transactions, Read all cafe transactions
CREATE POLICY transactions_cashier_insert ON transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        get_current_user_role() = 'cashier'
        AND user_belongs_to_cafe(cafe_id)
        AND created_by = auth.uid()
    );

CREATE POLICY transactions_cashier_select ON transactions
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND user_belongs_to_cafe(cafe_id)
    );

-- Cashier cannot update/delete transactions (immutable for audit)

-- ============================================================================
-- 12. POLICIES: TRANSACTION_ITEMS
-- ============================================================================

-- Superadmin: Full access
CREATE POLICY transaction_items_superadmin_all ON transaction_items
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Admin: Full access via transaction ownership
CREATE POLICY transaction_items_admin_all ON transaction_items
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_items.transaction_id
            AND user_belongs_to_cafe(t.cafe_id)
        )
    );

-- Cashier: Create + Read via transaction
CREATE POLICY transaction_items_cashier_insert ON transaction_items
    FOR INSERT TO authenticated
    WITH CHECK (
        get_current_user_role() = 'cashier'
        AND EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_items.transaction_id
            AND t.created_by = auth.uid()
        )
    );

CREATE POLICY transaction_items_cashier_select ON transaction_items
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_items.transaction_id
            AND user_belongs_to_cafe(t.cafe_id)
        )
    );

-- ============================================================================
-- 13. POLICIES: STOCK_MUTATIONS
-- ============================================================================

-- Superadmin: Full access
CREATE POLICY stock_mutations_superadmin_all ON stock_mutations
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Admin: Full access to their cafe
CREATE POLICY stock_mutations_admin_all ON stock_mutations
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND user_belongs_to_cafe(cafe_id)
    );

-- Cashier: Read-only (can view stock history)
CREATE POLICY stock_mutations_cashier_read ON stock_mutations
    FOR SELECT TO authenticated
    USING (
        get_current_user_role() = 'cashier'
        AND user_belongs_to_cafe(cafe_id)
    );

-- ============================================================================
-- 14. POLICIES: PUSH_SUBSCRIPTIONS
-- ============================================================================

-- Users can manage their own subscriptions
CREATE POLICY push_subscriptions_user_own ON push_subscriptions
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Admin can manage all subscriptions for their cafe
CREATE POLICY push_subscriptions_admin_cafe ON push_subscriptions
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND user_belongs_to_cafe(cafe_id)
    );

-- Superadmin: Full access
CREATE POLICY push_subscriptions_superadmin ON push_subscriptions
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- ============================================================================
-- 15. POLICIES: USER_PROFILES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY user_profiles_own_read ON user_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY user_profiles_own_update ON user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admin can manage users in their cafe
CREATE POLICY user_profiles_admin_cafe ON user_profiles
    FOR ALL TO authenticated
    USING (
        get_current_user_role() = 'admin'
        AND (
            -- Can manage users in their cafe
            cafe_id IN (SELECT get_user_cafe_ids())
            -- Or their own profile
            OR user_id = auth.uid()
        )
    );

-- Superadmin: Full access
CREATE POLICY user_profiles_superadmin_all ON user_profiles
    FOR ALL TO authenticated
    USING (get_current_user_role() = 'superadmin');

-- Allow insert untuk auth trigger (system-level)
CREATE POLICY user_profiles_insert_trigger ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Actual check di trigger function

-- ============================================================================
-- 16. ANON POLICIES (Disable anon access)
-- ============================================================================

-- Pastikan tidak ada anon access kecuali untuk public data yang memang diperlukan
CREATE POLICY cafes_anon_no_access ON cafes FOR ALL TO anon USING (false);
CREATE POLICY menu_anon_no_access ON menu FOR ALL TO anon USING (false);
CREATE POLICY transactions_anon_no_access ON transactions FOR ALL TO anon USING (false);

COMMENT ON TABLE user_profiles IS 'User profile dengan RLS: user manage own, admin manage cafe users, superadmin manage all';
