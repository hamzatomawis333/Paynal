-- ============================================
-- Seller shop details on the users table
-- Run this in phpMyAdmin or MySQL CLI
--
-- The contact number and home address already exist on `users` as
-- `phone` and `address`. These three columns hold the shop-specific
-- details collected when someone registers as a vendor. They stay
-- NULL for buyers and admins.
-- ============================================

USE maranao_treasures_db;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS shop_name VARCHAR(150) DEFAULT NULL AFTER phone,
    ADD COLUMN IF NOT EXISTS shop_address TEXT DEFAULT NULL AFTER address,
    ADD COLUMN IF NOT EXISTS gcash_number VARCHAR(20) DEFAULT NULL AFTER shop_address;