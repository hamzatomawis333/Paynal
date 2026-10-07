-- Checkout is GCash-only, but `orders.payment_method` and
-- `payments.payment_method` were defined as ENUM('online','cod'). Under
-- MySQL's non-strict mode a value outside the list is inserted as an empty
-- string with a warning instead of raising an error, so a 'gcash' order
-- looked like it saved successfully while storing ''.
--
-- 'gcash' is appended, keeping the existing values so any historical or
-- administrative rows stay valid.

ALTER TABLE `orders`
  MODIFY COLUMN `payment_method` ENUM('online','cod','gcash') NOT NULL DEFAULT 'cod';

ALTER TABLE `payments`
  MODIFY COLUMN `payment_method` ENUM('online','cod','gcash') DEFAULT NULL;