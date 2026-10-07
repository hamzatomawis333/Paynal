-- ============================================
-- Seller Subscription & Admin Chat Migration
-- Run this in phpMyAdmin or MySQL CLI
-- ============================================

USE maranao_treasures_db;

-- ============================================
-- 1. SELLER SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS seller_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    status ENUM('Pending', 'Active', 'Expired', 'Rejected') NOT NULL DEFAULT 'Pending',
    approved_by INT DEFAULT NULL,
    approved_at TIMESTAMP NULL DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sub_seller ON seller_subscriptions(seller_id);
CREATE INDEX idx_sub_status ON seller_subscriptions(status);

-- ============================================
-- 2. ADD type COLUMN TO conversations TABLE
-- Supports 'buyer_seller' (default) and 'seller_admin'
-- ============================================
ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS type ENUM('buyer_seller', 'seller_admin') NOT NULL DEFAULT 'buyer_seller'
    AFTER product_id;

-- Update unique constraint for seller_admin conversations (one per seller-admin pair)
-- Drop old unique constraint and add new one that includes type
ALTER TABLE conversations
    DROP INDEX IF EXISTS unique_conversation;

ALTER TABLE conversations
    ADD UNIQUE KEY unique_conversation (buyer_id, seller_id, product_id, type);

CREATE INDEX IF NOT EXISTS idx_conv_type ON conversations(type);
