-- ============================================
-- Manual GCash payment workflow
-- ============================================
-- Reuses the existing `payments` table and the existing orders.status /
-- payment_status ENUMs. Nothing is dropped or renamed, and every new ENUM
-- value is APPENDED so historical rows keep validating.
--
-- Why each addition is genuinely required:
--
-- 1. payments.seller_id
--    The existing table is order-scoped only (one row per order). A cart can
--    hold products from several vendors, and each vendor must be paid and
--    confirm separately, so a payment row has to belong to exactly one seller.
--    Existing rows keep NULL (pre-workflow orders), which MySQL's unique index
--    tolerates, so nothing collides.
--
-- 2. payments.conversation_id
--    Links a payment request to the existing buyer<->seller conversation so
--    "Open Conversation" needs no second lookup and cannot drift.
--
-- 3. payments.rejection_reason
--    The seller must be able to tell the buyer *why* verification failed
--    (not received / wrong amount / wrong number / unverifiable / other).
--
-- 4. payments.status gains 'awaiting_confirmation' and 'rejected'.
--    The existing 'pending' means "created, buyer has not paid yet" and
--    'completed' means "seller confirmed money arrived". Neither can express
--    the middle state "buyer says they sent it, seller has not checked".
--
-- 5. orders.payment_status gains 'pending', 'awaiting_confirmation',
--    'rejected' as the aggregate of the per-seller payment rows. 'unpaid' and
--    'paid' are kept for existing rows and for backward compatibility.
--
-- State machine (per seller):
--   pending -> awaiting_confirmation -> completed        (confirmed)
--   pending -> awaiting_confirmation -> rejected
--
-- Note: the one-per-(order, seller) unique key is what makes "prevent
-- duplicate payment requests" enforceable at the storage layer rather than
-- only in application code.
--
-- 6. orders.idempotency_key
--    A client-generated key sent with the checkout attempt. The unique index
--    makes a double-clicked "Place Order" (or an automatic retry) return the
--    already-created order instead of creating a second one and decrementing
--    stock twice. NULL stays allowed so historical and non-checkout orders are
--    unaffected.

ALTER TABLE `payments`
  ADD COLUMN `seller_id` INT NULL AFTER `order_id`,
  ADD COLUMN `conversation_id` INT NULL AFTER `status`,
  ADD COLUMN `rejection_reason` VARCHAR(255) DEFAULT NULL AFTER `conversation_id`,
  ADD UNIQUE KEY `unique_order_seller_payment` (`order_id`, `seller_id`),
  ADD INDEX `idx_payments_seller` (`seller_id`),
  ADD CONSTRAINT `fk_payments_seller` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payments_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE SET NULL;

ALTER TABLE `payments`
  MODIFY COLUMN `status` ENUM('pending','awaiting_confirmation','completed','rejected','failed','refunded')
    NOT NULL DEFAULT 'pending';

ALTER TABLE `orders`
  MODIFY COLUMN `payment_status` ENUM('pending','unpaid','awaiting_confirmation','paid','rejected','refunded')
    NOT NULL DEFAULT 'pending';

ALTER TABLE `orders`
  ADD COLUMN `idempotency_key` VARCHAR(64) DEFAULT NULL AFTER `notes`,
  ADD UNIQUE KEY `unique_orders_idempotency_key` (`idempotency_key`);