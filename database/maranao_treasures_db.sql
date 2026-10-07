-- ============================================
-- Maranao Treasures Online - MySQL Database Schema
-- Database Name: maranao_treasures_db
-- For XAMPP (MySQL/MariaDB)
-- ============================================

-- Create the database
CREATE DATABASE IF NOT EXISTS maranao_treasures_db;
USE maranao_treasures_db;

-- ============================================
-- 1. USERS TABLE
-- Stores all users (admin, seller, buyer)
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'seller', 'buyer') NOT NULL DEFAULT 'buyer',
    phone VARCHAR(20) DEFAULT NULL,
    shop_name VARCHAR(150) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    shop_address TEXT DEFAULT NULL,
    gcash_number VARCHAR(20) DEFAULT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- 2. ARTISAN PROFILES TABLE
-- Extra details for sellers/artisans
-- ============================================
CREATE TABLE artisan_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    specialty VARCHAR(100) NOT NULL,
    story TEXT DEFAULT NULL,
    location VARCHAR(200) DEFAULT NULL,
    years_of_experience INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 3. CATEGORIES TABLE
-- Product categories (brassware, textiles, etc.)
-- ============================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. PRODUCTS TABLE
-- All products listed on the marketplace
-- ============================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    cultural_background TEXT DEFAULT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    image_url VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(2, 1) DEFAULT 0.0,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- ============================================
-- 5. PRODUCT IMAGES TABLE
-- Multiple images per product
-- ============================================
CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- 6. CART TABLE
-- Shopping cart for buyers
-- ============================================
CREATE TABLE cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (user_id, product_id)
);

-- ============================================
-- 7. ORDERS TABLE
-- Order records
-- ============================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_fee DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') 
        NOT NULL DEFAULT 'pending',
    payment_method ENUM('online', 'cod', 'gcash') NOT NULL DEFAULT 'cod',
    payment_status ENUM('pending', 'unpaid', 'awaiting_confirmation', 'paid', 'rejected', 'refunded') NOT NULL DEFAULT 'pending',
    shipping_address TEXT NOT NULL,
    notes TEXT DEFAULT NULL,
    -- Client-supplied key for one checkout attempt. The unique index is what
    -- stops a double-clicked "Place Order" from creating two orders and
    -- decrementing stock twice.
    idempotency_key VARCHAR(64) DEFAULT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 8. ORDER ITEMS TABLE
-- Individual items in each order
-- ============================================
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    seller_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 9. REVIEWS TABLE
-- Product reviews and ratings by buyers
-- ============================================
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (product_id, user_id)
);

-- ============================================
-- 10. PAYMENTS TABLE
-- Payment transaction records
-- ============================================
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    -- One payment row per (order, seller): a single cart can span several
    -- vendors and each is paid and confirmed independently.
    seller_id INT DEFAULT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('online', 'cod', 'gcash') DEFAULT NULL,
    -- Required for GCash: the seller's only shared evidence that money moved.
    -- NULL is still possible for non-GCash methods (e.g. COD).
    transaction_reference VARCHAR(100) DEFAULT NULL,
    -- pending -> awaiting_confirmation -> completed | rejected
    status ENUM('pending', 'awaiting_confirmation', 'completed', 'rejected', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    conversation_id INT DEFAULT NULL,
    rejection_reason VARCHAR(255) DEFAULT NULL,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_order_seller_payment (order_id, seller_id)
);

CREATE INDEX idx_payments_seller ON payments(seller_id);

-- ============================================
-- 11. PAYMENT METHODS TABLE
-- Available payment options managed by admin
-- ============================================
CREATE TABLE payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    icon VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- SAMPLE DATA: Payment Methods
-- ============================================
INSERT INTO payment_methods (name, code, description, icon, is_active, sort_order) VALUES
('Cash on Delivery (COD)', 'cod', 'Buyer pays when the item arrives.', 'cod', 1, 1),
('GCash', 'gcash', 'Popular mobile wallet in the Philippines.', 'gcash', 1, 2),
('Bank Transfer', 'bank_transfer', 'Payment through a bank account.', 'bank_transfer', 1, 3),
('Credit / Debit Card', 'credit_card', 'Using Visa or Mastercard.', 'credit_card', 1, 4),
('PayPal', 'paypal', 'International online payment system.', 'paypal', 1, 5);

--
-- SAMPLE DATA: Categories
-- ============================================
INSERT INTO categories (name, slug, description) VALUES
('Brassware', 'brassware', 'Traditional brass craftsmanship including gador, sarimanok, and ceremonial items'),
('Textiles & Malong', 'textiles', 'Handwoven fabrics and garments featuring traditional Maranao patterns'),
('Handicrafts', 'handicrafts', 'Woven baskets, mats, and decorative items made from natural materials'),
('Accessories', 'accessories', 'Traditional jewelry, beads, and ornamental pieces with okir designs'),
('Woodcraft', 'woodcraft', 'Hand-carved wooden artworks depicting Maranao legends and symbols'),
('Artworks', 'artworks', 'Traditional paintings, calligraphy, and mixed-media art pieces');

-- ============================================
-- SAMPLE DATA: Admin User
-- Password: admin123 (use password_hash('admin123', PASSWORD_BCRYPT) in PHP)
-- NOTE: Replace this hash with a proper bcrypt hash from your PHP code
-- ============================================
INSERT INTO users (full_name, email, password_hash, role) VALUES
('System Admin', 'admin@maranaotreaures.com', '$2y$10$placeholder_hash_replace_me', 'admin');

-- ============================================
-- SAMPLE DATA: Artisan/Seller Users
-- NOTE: Replace password hashes with proper bcrypt hashes
-- ============================================
INSERT INTO users (full_name, email, password_hash, role, phone, address) VALUES
('Master Hadji Ibrahim', 'hadji@example.com', '$2y$10$placeholder_hash_replace_me', 'seller', '09171234567', 'Tugaya, Lanao del Sur'),
('Weaver Amina Salipada', 'amina@example.com', '$2y$10$placeholder_hash_replace_me', 'seller', '09181234567', 'Marawi City'),
('Carver Abdul Mangondato', 'abdul@example.com', '$2y$10$placeholder_hash_replace_me', 'seller', '09191234567', 'Wato-Balindong, Lanao del Sur');

-- Artisan Profiles
INSERT INTO artisan_profiles (user_id, specialty, story, location, years_of_experience, is_featured) VALUES
(2, 'Brassware', 'With over 40 years of experience, Hadji Ibrahim has dedicated his life to preserving the traditional art of Maranao brass making. His works have been featured in national exhibitions.', 'Tugaya, Lanao del Sur', 40, TRUE),
(3, 'Textile Weaving', 'Amina learned the art of weaving from her grandmother at age 12. She continues the tradition while training young women in the community.', 'Marawi City', 25, TRUE),
(4, 'Woodcraft', 'Abdul creates stunning wooden sculptures that tell stories of Maranao legends. His intricate okir carvings are sought after by collectors worldwide.', 'Wato-Balindong, Lanao del Sur', 30, TRUE);

-- ============================================
-- SAMPLE DATA: Products
-- ============================================
INSERT INTO products (seller_id, category_id, name, description, cultural_background, price, stock_quantity, image_url, is_active, rating, total_reviews) VALUES
(2, 1, 'Traditional Brass Gador', 'Handcrafted brass jar featuring intricate okir patterns, a symbol of Maranao royalty and craftsmanship.', 'The Gador is a traditional Maranao brass container used during important ceremonies and as a symbol of wealth and status.', 4500.00, 10, 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&q=80', TRUE, 4.8, 24),
(3, 2, 'Royal Malong Textile', 'Authentic handwoven Malong featuring traditional geometric patterns in vibrant colors.', 'The Malong is a versatile tubular garment that represents Maranao identity and is worn during various occasions.', 2800.00, 15, 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80', TRUE, 4.9, 42),
(4, 3, 'Handwoven Rattan Basket', 'Skillfully woven basket using traditional techniques passed down through generations.', 'Basket weaving is an ancient Maranao tradition that demonstrates the resourcefulness and artistry of the community.', 1200.00, 20, 'https://images.unsplash.com/photo-1595408076683-5d0c643e1683?w=600&q=80', TRUE, 4.7, 18),
(2, 4, 'Okir Brass Necklace Set', 'Elegant brass jewelry set featuring miniature okir designs. Includes necklace with matching earrings.', 'Maranao jewelry often incorporates okir patterns that hold deep cultural significance and represent prosperity.', 1800.00, 25, 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80', TRUE, 4.6, 31),
(4, 5, 'Carved Warrior Wall Art', 'Hand-carved wooden artwork depicting a traditional Maranao warrior.', 'Wood carving is a prestigious art form in Maranao culture, often depicting legendary heroes and epic stories.', 5500.00, 5, 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=600&q=80', TRUE, 5.0, 12),
(2, 1, 'Miniature Brass Sarimanok', 'The legendary Sarimanok bird crafted in gleaming brass. A symbol of good fortune.', 'The Sarimanok is a mythical bird in Maranao folklore, representing prosperity and good fortune.', 3200.00, 8, 'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=600&q=80', TRUE, 4.9, 56);

-- ============================================
-- USEFUL INDEXES for performance
-- ============================================
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_cart_user ON cart(user_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- ============================================
-- 9. WISHLIST TABLE
-- Stores buyer's favorite products
-- ============================================
CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_wishlist (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_wishlist_user ON wishlist(user_id);

-- ============================================
-- 10. MESSAGING TABLES
-- Buyer <-> Seller chat per product (or general)
-- ============================================
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    product_id INT DEFAULT NULL,
    type ENUM('buyer_seller', 'seller_admin') NOT NULL DEFAULT 'buyer_seller',
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_conversation (buyer_id, seller_id, product_id, type),
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    body TEXT NOT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE seller_subscriptions (
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

CREATE INDEX idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller ON conversations(seller_id);
CREATE INDEX idx_conv_type ON conversations(type);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- payments.conversation_id links a payment request to the buyer<->seller
-- conversation it was raised in. Added here because `conversations` is created
-- after `payments` above, so the constraint cannot be declared inline.
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_conversation
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL;

-- ============================================
-- PAYMENT EVENTS TABLE (audit trail)
-- ============================================
-- Append-only record of every manual payment state change, who made it, and
-- why. `payments.status` only holds the current value, so once a payment is
-- rejected and then rescued there is no way to see that it was ever rejected,
-- who reopened it, or what they said at the time. This is money moving between
-- strangers on a manually verified workflow, so the full path stays visible.
--
-- Written for every transition, not just the unusual ones: a dispute later
-- needs to show the ordinary happy path too.
CREATE TABLE IF NOT EXISTS payment_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    -- The acting user. Nullable so an audit row survives the user being deleted.
    actor_id INT DEFAULT NULL,
    actor_role ENUM('buyer', 'seller', 'system') DEFAULT NULL,
    -- Named after what happened, not the raw status pair, so the trail reads
    -- as a story: submitted, confirmed, rejected, resubmitted, received_late.
    event_type ENUM('submitted', 'confirmed', 'rejected', 'resubmitted', 'received_late') NOT NULL,
    from_status VARCHAR(32) DEFAULT NULL,
    to_status VARCHAR(32) DEFAULT NULL,
    -- Free text: the seller's rejection label, or the note given when they
    -- confirm money that arrived after they had already rejected.
    note VARCHAR(255) DEFAULT NULL,
    -- Snapshot of the reference at this moment. Needed because a resubmission
    -- overwrites payments.transaction_reference, so the value that was actually
    -- rejected would otherwise be unrecoverable.
    reference_snapshot VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX idx_payment_events_created ON payment_events(created_at);
