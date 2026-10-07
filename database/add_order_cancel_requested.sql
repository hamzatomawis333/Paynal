-- Two-step cancellation: the buyer can only ASK for a cancellation; the seller
-- confirms it from their orders screen. The flag lives alongside status so the
-- order stays fully active (stock untouched) until the seller confirms.
ALTER TABLE orders
  ADD COLUMN cancel_requested TINYINT(1) NOT NULL DEFAULT 0 AFTER payment_method;
