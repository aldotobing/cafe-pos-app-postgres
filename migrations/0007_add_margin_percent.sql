-- Add margin_percent column to menu table
-- This stores the profit margin percentage used to calculate selling price from HPP
ALTER TABLE menu ADD COLUMN margin_percent REAL DEFAULT 30.0;
