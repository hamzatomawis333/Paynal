<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Forbidden"], 403);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$orderId = intval($_GET['id'] ?? 0);

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

// ============================================
// GET /admin/orders.php?id=N
// One order with its items and per-seller payment rows.
// ============================================
if ($orderId) {
    $stmt = $conn->prepare(
        "SELECT o.*, u.full_name AS buyer_name, u.email AS buyer_email
         FROM orders o JOIN users u ON o.user_id = u.id
         WHERE o.id = ?"
    );
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order) respond(["error" => "Order not found"], 404);

    $stmt = $conn->prepare(
        "SELECT oi.*, p.name, p.image_url, u.full_name AS seller_name FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         LEFT JOIN users u ON u.id = oi.seller_id
         WHERE oi.order_id = ?"
    );
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order['items'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // Sorted like the checkout response: seller-owned payments first, then any
    // legacy order-scoped row (seller_id NULL).
    $stmt = $conn->prepare(
        "SELECT pay.*, u.full_name AS seller_name
         FROM payments pay LEFT JOIN users u ON u.id = pay.seller_id
         WHERE pay.order_id = ?
         ORDER BY pay.seller_id IS NULL, pay.seller_id"
    );
    $stmt->bind_param("i", $orderId);
    $stmt->execute();
    $order['payments'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    respond(["order" => $order]);
}

// ============================================
// GET /admin/orders.php?status=...&search=...
// List all orders, newest first. Both filters are optional.
// ============================================
$status = trim((string) ($_GET['status'] ?? ''));
$search = trim((string) ($_GET['search'] ?? ''));

if ($status !== '' && !in_array($status, ORDER_STATUSES, true)) {
    respond(["error" => "Invalid status filter"], 400);
}
if ($search !== '' && mb_strlen($search) > 80) {
    respond(["error" => "Search term too long"], 400);
}

$where = [];
$params = [];
$types = "";

if ($status !== '') {
    $where[] = "o.status = ?";
    $params[] = $status;
    $types .= "s";
}
if ($search !== '') {
    $where[] = "(o.order_number LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)";
    $like = '%' . $search . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types .= "sss";
}

$sql = "SELECT o.id, o.order_number, o.total_amount, o.shipping_fee, o.status, o.payment_method,
               o.payment_status, o.created_at,
               u.full_name AS buyer_name, u.email AS buyer_email,
               (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
        FROM orders o JOIN users u ON o.user_id = u.id";
if ($where) {
    $sql .= " WHERE " . implode(" AND ", $where);
}
$sql .= " ORDER BY o.created_at DESC";

$stmt = $conn->prepare($sql);
if ($params) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$orders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

respond(["orders" => $orders]);