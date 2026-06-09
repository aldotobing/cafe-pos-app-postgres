-- Migration: Notification System
-- Description: Notifications table for in-app bell + push delivery via Realtime
-- Created: 2026-06-09

-- ============================================
-- 1. NOTIFICATION TYPE ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'low_stock',
    'out_of_stock',
    'trial_expiring',
    'new_transaction'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    cafe_id INTEGER NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_pushed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_cafe_time
  ON notifications(cafe_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_unpushed
  ON notifications(id)
  WHERE is_pushed = false AND deleted_at IS NULL;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read notifications for their cafe
CREATE POLICY "notifications_read_cafe" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    cafe_id IN (
      SELECT cafe_id FROM user_profiles WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Users can mark their cafe notifications as read
CREATE POLICY "notifications_update_cafe" ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    cafe_id IN (
      SELECT cafe_id FROM user_profiles WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    cafe_id IN (
      SELECT cafe_id FROM user_profiles WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Superadmins can see all
CREATE POLICY "notifications_superadmin" ON notifications
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = auth.uid() AND deleted_at IS NULL) = 'superadmin'
  );

-- Service role full access
CREATE POLICY "notifications_service_role" ON notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. DB TRIGGER: Transaction → Notification
-- ============================================
CREATE OR REPLACE FUNCTION trg_notify_new_transaction()
RETURNS TRIGGER AS $$
DECLARE
  cafe_name TEXT;
  cashier_name TEXT;
BEGIN
  SELECT name INTO cafe_name FROM cafes WHERE id = NEW.cafe_id;

  INSERT INTO notifications (cafe_id, type, title, body, data)
  VALUES (
    NEW.cafe_id,
    'new_transaction',
    'Transaksi Baru #' || NEW.transaction_number,
    'Sebesar Rp ' || NEW.total_amount::BIGINT || ' oleh ' || COALESCE(NEW.cashier_name, 'Kasir'),
    jsonb_build_object(
      'transaction_id', NEW.id,
      'transaction_number', NEW.transaction_number,
      'total_amount', NEW.total_amount,
      'cafe_id', NEW.cafe_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transaction_notify ON transactions;
CREATE TRIGGER trg_transaction_notify
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_new_transaction();

-- ============================================
-- 5. DB TRIGGER: Stock Depletion → Notification
-- ============================================
CREATE OR REPLACE FUNCTION trg_notify_stock_change()
RETURNS TRIGGER AS $$
DECLARE
  menu_name TEXT;
BEGIN
  -- Only fire if track_stock is enabled and stock actually changed
  IF NEW.track_stock IS TRUE AND NEW.stock_quantity <> COALESCE(OLD.stock_quantity, NEW.stock_quantity) THEN
    SELECT name INTO menu_name FROM menu WHERE id = NEW.menu_id;

    IF NEW.stock_quantity = 0 AND COALESCE(OLD.stock_quantity, 0) > 0 THEN
      INSERT INTO notifications (cafe_id, type, title, body, data)
      VALUES (
        (SELECT cafe_id FROM menu WHERE id = NEW.menu_id),
        'out_of_stock',
        COALESCE(NEW.variant_name, menu_name, 'Item') || ' habis',
        'Stok habis. Segera lakukan restok.',
        jsonb_build_object('menu_id', NEW.menu_id, 'variant_id', NEW.id)
      );
    ELSIF NEW.stock_quantity > 0 AND NEW.stock_quantity <= COALESCE(NEW.min_stock, 5)
          AND COALESCE(OLD.stock_quantity, 9999) > COALESCE(NEW.min_stock, 5) THEN
      INSERT INTO notifications (cafe_id, type, title, body, data)
      VALUES (
        (SELECT cafe_id FROM menu WHERE id = NEW.menu_id),
        'low_stock',
        COALESCE(NEW.variant_name, menu_name, 'Item') || ' hampir habis',
        'Stok tersisa ' || NEW.stock_quantity || ' (min ' || COALESCE(NEW.min_stock, 5) || ').',
        jsonb_build_object('menu_id', NEW.menu_id, 'variant_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_variant_stock_notify ON product_variants;
CREATE TRIGGER trg_variant_stock_notify
  AFTER UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_stock_change();
