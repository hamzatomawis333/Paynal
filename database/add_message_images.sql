-- ============================================
-- Add image support to messages table
-- Run this in phpMyAdmin or MySQL CLI
-- ============================================

USE maranao_treasures_db;

-- Add image_url column to messages table
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL AFTER body;
