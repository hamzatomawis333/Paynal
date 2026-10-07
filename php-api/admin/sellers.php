<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Forbidden"], 403);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$sellerId = intval($_GET['id'] ?? 0);

// ============================================
// GET /admin/sellers.php?id=N
// One seller: profile, products, sales, payments.
// ============================================
if ($sellerId) {
    $stmt = $conn->prepare(
        "SELECT u.id, u.full_name, u.email, u.phone, u.address, u.shop_name, u.shop_address,
                       u.gcash_number, u.avatar_url, u.is_active, u.created_at,
                (SELECT COUNT(*) FROM products p WHERE p.seller_id = u.id) AS product_count,
                (SELECT COUNT(DISTINCT oi.order_id) FROM order_items oi
                   JOIN orders o ON o.id = oi.order_id
                   WHERE oi.seller_id = u.id AND o.status <> 'cancelled') AS order_count,
                (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                   JOIN orders o ON o.id = oi.order_id
                   WHERE oi.seller_id = u.id AND o.status <> 'cancelled') AS sold_items,
                (SELECT COALESCE(SUM(oi.subtotal), 0) FROM order_items oi
                   JOIN orders o ON o.id = oi.order_id
                   WHERE oi.seller_id = u.id AND o.status <> 'cancelled') AS total_sales
         FROM users u WHERE u.id = ? AND u.role = 'seller'"
    );
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $seller = $stmt->get_result()->fetch_assoc();
    if (!$seller) respond(["error" => "Seller not found"], 404);

    // Products the seller has posted
    $stmt = $conn->prepare(
        "SELECT id, name, price, stock_quantity, image_url, is_active, created_at
         FROM products WHERE seller_id = ? ORDER BY created_at DESC"
    );
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $seller['products'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // Recent sales (their order items, newest 50; cancelled orders excluded)
    $stmt = $conn->prepare(
        "SELECT oi.id, oi.quantity, oi.unit_price, oi.subtotal, oi.created_at,
                o.order_number, o.status AS order_status, p.name AS product_name
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         WHERE oi.seller_id = ? AND o.status <> 'cancelled'
         ORDER BY oi.created_at DESC LIMIT 50"
    );
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $seller['sales'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // Payment rows tied to this seller (what the buyer was asked to send them)
    $stmt = $conn->prepare(
        "SELECT pay.*, o.order_number FROM payments pay
         JOIN orders o ON o.id = pay.order_id
         WHERE pay.seller_id = ?
         ORDER BY pay.created_at DESC LIMIT 20"
    );
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $seller['payments'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    respond(["seller" => $seller]);
}

// ============================================
// GET /admin/sellers.php?search=...
// List every seller account with their product/sales totals.
// ============================================
$search = trim((string) ($_GET['search'] ?? ''));
if ($search !== '' && mb_strlen($search) > 80) {
    respond(["error" => "Search term too long"], 400);
}

$sql = "SELECT u.id, u.full_name, u.email, u.phone, u.shop_name, u.gcash_number, u.avatar_url,
               u.is_active, u.created_at,
               (SELECT COUNT(*) FROM products p WHERE p.seller_id = u.id) AS product_count,
               (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                  JOIN orders o ON o.id = oi.order_id
                  WHERE oi.seller_id = u.id AND o.status <> 'cancelled') AS sold_items,
               (SELECT COALESCE(SUM(oi.subtotal), 0) FROM order_items oi
                  JOIN orders o ON o.id = oi.order_id
                  WHERE oi.seller_id = u.id AND o.status <> 'cancelled') AS total_sales
        FROM users u WHERE u.role = 'seller'";

if ($search !== '') {
    $like = '%' . $search . '%';
    $sql .= " AND (u.shop_name LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $like, $like, $like);
    $stmt->execute();
} else {
    $stmt = $conn->prepare($sql);
    $stmt->execute();
}

$sellers = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

respond(["sellers" => $sellers]);