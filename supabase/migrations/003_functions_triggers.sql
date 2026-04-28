-- ============================================================================
-- MIGRATION: Functions and Triggers
-- File: 003_functions_triggers.sql
-- Description: Auto-updated_at, version increment, dan utility functions
-- ============================================================================

-- ============================================================================
-- 1. AUTO UPDATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at_and_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Only increment version if not explicitly set
    IF NEW.version IS NULL OR NEW.version = OLD.version THEN
        NEW.version = COALESCE(OLD.version, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. TRIGGERS FOR ALL TABLES WITH updated_at & version
-- ============================================================================

-- Cafes
CREATE TRIGGER tr_cafes_updated
    BEFORE UPDATE ON cafes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Cafe Settings
CREATE TRIGGER tr_cafe_settings_updated
    BEFORE UPDATE ON cafe_settings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Categories
CREATE TRIGGER tr_categories_updated
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Menu
CREATE TRIGGER tr_menu_updated
    BEFORE UPDATE ON menu
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Product Variants
CREATE TRIGGER tr_product_variants_updated
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Variant Attributes
CREATE TRIGGER tr_variant_attributes_updated
    BEFORE UPDATE ON variant_attributes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Variant Attribute Values
CREATE TRIGGER tr_variant_values_updated
    BEFORE UPDATE ON variant_attribute_values
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Transactions
CREATE TRIGGER tr_transactions_updated
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Transaction Items (version only)
CREATE TRIGGER tr_transaction_items_updated
    BEFORE UPDATE ON transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- User Profiles
CREATE TRIGGER tr_user_profiles_updated
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- Push Subscriptions
CREATE TRIGGER tr_push_subscriptions_updated
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at_and_version();

-- ============================================================================
-- 3. AUTH USER AUTO-CREATE PROFILE TRIGGER
-- ============================================================================

-- Function: Auto-create user_profile saat user signup via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_cafe_id INTEGER;
    v_created_by UUID;
BEGIN
    -- Extract metadata dari auth signup
    v_cafe_id := (NEW.raw_user_meta_data ->> 'cafe_id')::INTEGER;
    v_created_by := (NEW.raw_user_meta_data ->> 'created_by')::UUID;

    INSERT INTO user_profiles (
        user_id,
        full_name,
        role,
        cafe_id,
        is_approved,
        is_active,
        created_by
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'admin'),
        v_cafe_id,
        COALESCE((NEW.raw_user_meta_data ->> 'is_approved')::BOOLEAN, FALSE),
        TRUE,
        v_created_by
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run setelah user dibuat di auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 4. TRANSACTION NUMBER GENERATOR
-- ============================================================================

-- Function: Generate unique transaction number (TXN-YYYYMMDD-XXXXX)
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_sequence INTEGER;
    v_result TEXT;
BEGIN
    v_prefix := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(transaction_number FROM LENGTH(v_prefix) + 1) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM transactions
    WHERE transaction_number LIKE v_prefix || '%'
    AND created_at >= DATE_TRUNC('day', NOW());
    
    v_result := v_prefix || LPAD(v_sequence::TEXT, 5, '0');
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. STOCK MUTATION TRIGGERS
-- ============================================================================

-- Function: Auto-update stock quantity saat mutation created
CREATE OR REPLACE FUNCTION handle_stock_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.variant_id IS NOT NULL THEN
        -- Update variant stock
        UPDATE product_variants
        SET stock_quantity = stock_quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.variant_id;
    ELSE
        -- Update menu item stock
        UPDATE menu
        SET stock_quantity = stock_quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.menu_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Apply stock changes after mutation insert
CREATE TRIGGER tr_stock_mutation_apply
    AFTER INSERT ON stock_mutations
    FOR EACH ROW
    EXECUTE FUNCTION handle_stock_mutation();

-- ============================================================================
-- 6. SOFT DELETE HELPER FUNCTIONS
-- ============================================================================

-- Function: Soft delete row dengan set deleted_at
CREATE OR REPLACE FUNCTION soft_delete(table_name TEXT, row_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET deleted_at = NOW(), updated_at = NOW() WHERE id = %L',
        table_name,
        row_id
    );
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Restore soft-deleted row
CREATE OR REPLACE FUNCTION soft_restore(table_name TEXT, row_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET deleted_at = NULL, updated_at = NOW() WHERE id = %L',
        table_name,
        row_id
    );
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRANSACTION TOTAL CALCULATOR
-- ============================================================================

-- Function: Recalculate transaction totals dari items
CREATE OR REPLACE FUNCTION recalculate_transaction_total(p_transaction_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal NUMERIC(12,2);
    v_tax_amount NUMERIC(12,2);
    v_service_charge NUMERIC(12,2);
    v_total NUMERIC(12,2);
    v_cafe_id INTEGER;
    v_tax_percent NUMERIC(5,2);
    v_service_percent NUMERIC(5,2);
BEGIN
    -- Get transaction cafe_id
    SELECT cafe_id INTO v_cafe_id
    FROM transactions WHERE id = p_transaction_id;
    
    -- Get tax & service percentages from cafe settings
    SELECT tax_percent, service_percent 
    INTO v_tax_percent, v_service_percent
    FROM cafe_settings 
    WHERE cafe_id = v_cafe_id 
    AND deleted_at IS NULL;
    
    -- Default jika tidak ada settings
    v_tax_percent := COALESCE(v_tax_percent, 10.0);
    v_service_percent := COALESCE(v_service_percent, 5.0);
    
    -- Calculate subtotal from items
    SELECT COALESCE(SUM((price * quantity) - discount), 0)
    INTO v_subtotal
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
    AND deleted_at IS NULL;
    
    -- Calculate tax & service
    v_tax_amount := ROUND(v_subtotal * v_tax_percent / 100, 2);
    v_service_charge := ROUND(v_subtotal * v_service_percent / 100, 2);
    v_total := v_subtotal + v_tax_amount + v_service_charge;
    
    -- Update transaction
    UPDATE transactions
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        service_charge = v_service_charge,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. UTILITY FUNCTIONS
-- ============================================================================

-- Get cafe settings dengan default values
CREATE OR REPLACE FUNCTION get_cafe_settings(p_cafe_id INTEGER)
RETURNS TABLE (
    name TEXT,
    tax_percent NUMERIC,
    service_percent NUMERIC,
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(cs.name, 'KasirKu Cafe'),
        COALESCE(cs.tax_percent, 10.0),
        COALESCE(cs.service_percent, 5.0),
        COALESCE(cs.currency, 'IDR')
    FROM cafe_settings cs
    WHERE cs.cafe_id = p_cafe_id
    AND cs.deleted_at IS NULL;
    
    -- Return defaults jika tidak ada
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'KasirKu Cafe'::TEXT, 10.0::NUMERIC, 5.0::NUMERIC, 'IDR'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Check if user is owner of cafe
CREATE OR REPLACE FUNCTION is_cafe_owner(p_cafe_id INTEGER, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM cafes 
        WHERE id = p_cafe_id 
        AND owner_user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. REALTIME SETUP (enable tables untuk realtime subscriptions)
-- ============================================================================

-- Enable realtime untuk tables yang perlu live updates
ALTER TABLE menu REPLICA IDENTITY FULL;
ALTER TABLE product_variants REPLICA IDENTITY FULL;
ALTER TABLE categories REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE stock_mutations REPLICA IDENTITY FULL;

-- Add tables ke supabase_realtime publication
-- (Dilakukan via Supabase Dashboard atau API karena butuh superuser)
-- PUBLICATION supabase_realtime ADD TABLE menu;
-- PUBLICATION supabase_realtime ADD TABLE product_variants;
-- PUBLICATION supabase_realtime ADD TABLE categories;
-- PUBLICATION supabase_realtime ADD TABLE transactions;
-- PUBLICATION supabase_realtime ADD TABLE stock_mutations;

COMMENT ON FUNCTION trigger_set_updated_at_and_version IS 'Auto-update updated_at dan increment version untuk optimistic locking';
COMMENT ON FUNCTION handle_new_user IS 'Auto-create user_profile saat signup via Supabase Auth';
COMMENT ON FUNCTION generate_transaction_number IS 'Generate TXN-YYYYMMDD-XXXXX format transaction number';
