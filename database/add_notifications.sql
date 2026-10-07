-- ============================================
-- In-app notifications
-- Run this in phpMyAdmin or MySQL CLI
-- ============================================
-- One row per event the current user should see in the bell dropdown:
--
--   message      a conversation partner sent a message
--   order        a buyer placed an order (seller is notified)
--   payment      a buyer submitted a GCash reference (seller verifies)
--   subscription a seller submitted a subscription payment (admin verifies)
--
-- is_read is flipped when the user opens the dropdown's "mark all", clicks the
-- item, or opens the conversation the message belongs to (messages/index.php
-- GET already marks messages read, so notifications follow in the same place).
--
-- related_id carries the conversation/order/payment/subscription id so a
-- notification can be auto-read when its screen is opened, without parsing
-- the link.

USE maranao_treasures_db;

CREATE TABLE IF NOT EXISTS notifications (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('message','order','payment','subscription') NOT NULL DEFAULT 'message',
    title VARCHAR(150) NOT NULL,
    body VARCHAR(255) DEFAULT NULL,
    link VARCHAR(255) DEFAULT NULL,
    related_id INT DEFAULT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user (user_id, is_read, created_at),
    KEY idx_notifications_related (user_id, type, related_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
