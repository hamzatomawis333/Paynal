-- ============================================
-- Subscription GCash payment workflow
-- Run this in phpMyAdmin or MySQL CLI
-- ============================================
-- Mirrors the buyer checkout GCash flow (add_gcash_payment_workflow.sql) so
-- paying for a subscription behaves exactly like paying for an order:
--
--   pending -> awaiting_confirmation -> completed   (admin confirms payment)
--   pending -> awaiting_confirmation -> rejected    (admin rejects, seller resubmits)
--
-- State machine (per subscription):
--   seller clicks Subscribe        -> status 'Pending', payment_status 'pending'
--   seller submits GCash reference -> payment_status 'awaiting_confirmation'
--   admin confirms                 -> payment_status 'completed' AND
--                                      status 'Active' (+30 days) atomically
--   admin rejects payment          -> payment_status 'rejected', status stays
--                                      'Pending' so the seller can resubmit
--
-- Why each addition is genuinely required:
--
-- 1. seller_subscriptions.payment_status
--    The existing status ENUM ('Pending','Active','Expired','Rejected') is the
--    subscription lifecycle; it cannot express "seller says they paid, admin
--    has not checked yet". A separate column keeps both state machines honest,
--    and the admin GET (SELECT ss.*) exposes it with no query change.
--
-- 2. payment_amount
--    The ₱299 price existed only as hard-coded frontend strings. Storing the
--    amount at creation time enforces it server-side and survives future
--    price changes.
--
-- 3. transaction_reference / payment_rejection_reason / paid_at
--    Same reasons as payments.transaction_reference / rejection_reason /
--    paid_at in the buyer flow: the reference is the evidence, the reason
--    tells the seller what to fix, paid_at records when money was verified.
--
-- 4. platform_settings
--    Buyers pay a seller's users.gcash_number. Subscriptions are paid to the
--    platform, which has no single owner row, so the destination number needs
--    its own admin-editable home.
--
-- 5. payment_events.subscription_id (payment_id becomes nullable)
--    payment_events.payment_id is NOT NULL today, so subscription payment
--    transitions would have no audit trail. The pair (payment_id,
--    subscription_id) is mutually exclusive by application code.

USE maranao_treasures_db;

-- ============================================
-- 1. PAYMENT STATE ON seller_subscriptions
-- ============================================
ALTER TABLE seller_subscriptions
    ADD COLUMN payment_status ENUM('pending','awaiting_confirmation','completed','rejected')
        NOT NULL DEFAULT 'pending' AFTER status,
    ADD COLUMN payment_amount DECIMAL(10,2) NOT NULL DEFAULT 299.00 AFTER payment_status,
    ADD COLUMN transaction_reference VARCHAR(100) DEFAULT NULL AFTER payment_amount,
    ADD COLUMN payment_rejection_reason VARCHAR(255) DEFAULT NULL AFTER transaction_reference,
    ADD COLUMN paid_at TIMESTAMP NULL DEFAULT NULL AFTER payment_rejection_reason;

-- ============================================
-- 2. PLATFORM GCASH NUMBER
-- ============================================
CREATE TABLE IF NOT EXISTS platform_settings (
    `key` VARCHAR(64) PRIMARY KEY,
    `value` VARCHAR(255) NOT NULL DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO platform_settings (`key`, `value`) VALUES ('gcash_number', '');

-- ============================================
-- 3. SUBSCRIPTION AUDIT TRAIL
-- ============================================
ALTER TABLE payment_events
    MODIFY COLUMN payment_id INT NULL DEFAULT NULL;

ALTER TABLE payment_events
    ADD COLUMN subscription_id INT DEFAULT NULL AFTER payment_id,
    ADD CONSTRAINT fk_payment_events_subscription
        FOREIGN KEY (subscription_id) REFERENCES seller_subscriptions(id) ON DELETE CASCADE;

CREATE INDEX idx_payment_events_subscription ON payment_events(subscription_id);

-- Admins verify subscription payments (confirm/reject), so the audit trail
-- must be able to name them as the actor.
ALTER TABLE payment_events
    MODIFY COLUMN actor_role ENUM('buyer','seller','admin','system') DEFAULT NULL;
