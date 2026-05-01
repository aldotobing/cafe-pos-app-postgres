-- Migration: Add Expense Management and Revenue Targets
-- Description: Adds tables for operational expenses and revenue target tracking
-- Created: 2026-05-01

-- ============================================
-- 1. EXPENSE CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (name <> ''),
    color TEXT DEFAULT '#6B7280',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);

-- Indexes for expense_categories
CREATE INDEX IF NOT EXISTS idx_expense_categories_cafe_id ON expense_categories(cafe_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_expense_categories_deleted_at ON expense_categories(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories
CREATE POLICY "expense_categories_select_policy" ON expense_categories
    FOR SELECT USING (
        deleted_at IS NULL AND (
            cafe_id IN (
                SELECT cafe_id FROM user_profiles 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "expense_categories_insert_policy" ON expense_categories
    FOR INSERT WITH CHECK (
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

CREATE POLICY "expense_categories_update_policy" ON expense_categories
    FOR UPDATE USING (
        deleted_at IS NULL AND
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

CREATE POLICY "expense_categories_delete_policy" ON expense_categories
    FOR DELETE USING (
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

-- ============================================
-- 2. EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    
    -- Financial Data
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    description TEXT,
    
    -- Date & Reference
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_number TEXT,
    receipt_url TEXT,
    
    -- Payment Method
    payment_method TEXT DEFAULT 'Tunai' CHECK (payment_method IN ('Tunai', 'QRIS', 'Debit', 'Transfer')),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1
);

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_cafe_id ON expenses(cafe_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date_range ON expenses(cafe_id, expense_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "expenses_select_policy" ON expenses
    FOR SELECT USING (
        deleted_at IS NULL AND (
            cafe_id IN (
                SELECT cafe_id FROM user_profiles 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "expenses_insert_policy" ON expenses
    FOR INSERT WITH CHECK (
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin', 'cashier')
            AND is_active = true
        )
    );

CREATE POLICY "expenses_update_policy" ON expenses
    FOR UPDATE USING (
        deleted_at IS NULL AND
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

CREATE POLICY "expenses_delete_policy" ON expenses
    FOR DELETE USING (
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

-- ============================================
-- 3. REVENUE TARGETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS revenue_targets (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    
    -- Target Period
    target_date DATE,
    target_month INTEGER CHECK (target_month >= 1 AND target_month <= 12),
    target_year INTEGER CHECK (target_year >= 2020 AND target_year <= 2100),
    
    -- Target Values
    daily_target NUMERIC DEFAULT 0 CHECK (daily_target >= 0),
    monthly_target NUMERIC DEFAULT 0 CHECK (monthly_target >= 0),
    
    -- Additional Info
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    
    -- Ensure unique target per period
    UNIQUE(cafe_id, target_year, target_month)
);

-- Indexes for revenue_targets
CREATE INDEX IF NOT EXISTS idx_revenue_targets_cafe_id ON revenue_targets(cafe_id);
CREATE INDEX IF NOT EXISTS idx_revenue_targets_period ON revenue_targets(target_year, target_month);
CREATE INDEX IF NOT EXISTS idx_revenue_targets_active ON revenue_targets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_revenue_targets_deleted_at ON revenue_targets(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE revenue_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for revenue_targets
CREATE POLICY "revenue_targets_select_policy" ON revenue_targets
    FOR SELECT USING (
        deleted_at IS NULL AND (
            cafe_id IN (
                SELECT cafe_id FROM user_profiles 
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

CREATE POLICY "revenue_targets_insert_policy" ON revenue_targets
    FOR INSERT WITH CHECK (
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

CREATE POLICY "revenue_targets_update_policy" ON revenue_targets
    FOR UPDATE USING (
        deleted_at IS NULL AND
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

CREATE POLICY "revenue_targets_delete_policy" ON revenue_targets
    FOR DELETE USING (
        cafe_id IN (
            SELECT cafe_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superadmin')
            AND is_active = true
        )
    );

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Updated at trigger for expense_categories
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
DROP FUNCTION IF EXISTS update_expense_categories_updated_at();

CREATE OR REPLACE FUNCTION update_expense_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_expense_categories_updated_at();

-- Updated at trigger for expenses
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
DROP FUNCTION IF EXISTS update_expenses_updated_at();

CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();

-- Updated at trigger for revenue_targets
DROP TRIGGER IF EXISTS update_revenue_targets_updated_at ON revenue_targets;
DROP FUNCTION IF EXISTS update_revenue_targets_updated_at();

CREATE OR REPLACE FUNCTION update_revenue_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_revenue_targets_updated_at
    BEFORE UPDATE ON revenue_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_revenue_targets_updated_at();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get expense summary by category for a date range
DROP FUNCTION IF EXISTS get_expense_summary(INTEGER, DATE, DATE);

CREATE OR REPLACE FUNCTION get_expense_summary(
    p_cafe_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    total_amount NUMERIC,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.id,
        ec.name,
        COALESCE(SUM(e.amount), 0) as total_amount,
        COUNT(e.id) as transaction_count
    FROM expense_categories ec
    LEFT JOIN expenses e ON 
        e.category_id = ec.id 
        AND e.cafe_id = p_cafe_id
        AND e.expense_date BETWEEN p_start_date AND p_end_date
        AND e.deleted_at IS NULL
    WHERE ec.cafe_id = p_cafe_id
        AND ec.is_active = true
        AND ec.deleted_at IS NULL
    GROUP BY ec.id, ec.name
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total expenses for a date range
DROP FUNCTION IF EXISTS get_total_expenses(INTEGER, DATE, DATE);

CREATE OR REPLACE FUNCTION get_total_expenses(
    p_cafe_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM expenses
    WHERE cafe_id = p_cafe_id
        AND expense_date BETWEEN p_start_date AND p_end_date
        AND deleted_at IS NULL;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue target for a specific month
DROP FUNCTION IF EXISTS get_monthly_target(INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_monthly_target(
    p_cafe_id INTEGER,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
    v_target NUMERIC;
BEGIN
    SELECT monthly_target
    INTO v_target
    FROM revenue_targets
    WHERE cafe_id = p_cafe_id
        AND target_year = p_year
        AND target_month = p_month
        AND is_active = true
        AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(v_target, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. COMMENTS
-- ============================================
COMMENT ON TABLE expense_categories IS 'Kategori pengeluaran operasional cafe';
COMMENT ON TABLE expenses IS 'Data pengeluaran operasional cafe';
COMMENT ON TABLE revenue_targets IS 'Target omzet harian/bulanan cafe';

COMMENT ON COLUMN expense_categories.name IS 'Nama kategori pengeluaran';
COMMENT ON COLUMN expense_categories.color IS 'Warna untuk visualisasi chart';
COMMENT ON COLUMN expenses.amount IS 'Jumlah pengeluaran';
COMMENT ON COLUMN expenses.expense_date IS 'Tanggal pengeluaran';
COMMENT ON COLUMN expenses.receipt_url IS 'URL foto nota (jika ada)';
COMMENT ON COLUMN revenue_targets.daily_target IS 'Target omzet per hari';
COMMENT ON COLUMN revenue_targets.monthly_target IS 'Target omzet per bulan';

SELECT 'Migration 005_expenses_and_targets completed successfully' as status;
