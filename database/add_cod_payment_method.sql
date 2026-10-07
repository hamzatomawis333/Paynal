-- Cash on Delivery as a checkout choice. orders.payment_method already has
-- 'cod' in its enum; this only adds the row the payment-methods endpoint
-- serves to the checkout screen.
INSERT INTO payment_methods (name, code, description, icon, is_active, sort_order)
SELECT 'Cash on Delivery (COD)', 'cod', 'Pay when the item arrives at your door.', 'cod', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE code = 'cod');
