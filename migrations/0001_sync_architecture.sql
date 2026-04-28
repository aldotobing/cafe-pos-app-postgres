-- Adding local-first sync metadata
-- This enables delta-sync (pull) and safe soft deletes

ALTER TABLE cafe_settings ADD COLUMN deleted_at TEXT;
ALTER TABLE cafe_settings ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE cafes ADD COLUMN deleted_at TEXT;
ALTER TABLE cafes ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE menu ADD COLUMN deleted_at TEXT;
ALTER TABLE menu ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE push_subscriptions ADD COLUMN deleted_at TEXT;
ALTER TABLE push_subscriptions ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE transaction_items ADD COLUMN deleted_at TEXT;
ALTER TABLE transaction_items ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE transactions ADD COLUMN deleted_at TEXT;
ALTER TABLE transactions ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE user_session ADD COLUMN deleted_at TEXT;
ALTER TABLE user_session ADD COLUMN version INTEGER DEFAULT 1;

ALTER TABLE users ADD COLUMN deleted_at TEXT;
ALTER TABLE users ADD COLUMN version INTEGER DEFAULT 1;


