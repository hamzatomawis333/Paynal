<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

// Total products
$stmt = $conn->prepare("SELECT COUNT(*) as total FROM products WHERE seller_id = ?");
$stmt->bind_param("i", $auth['user_id']);
$stmt->execute();
$totalProducts = $stmt->get_result()->fetch_assoc()['total'];

// Total orders
$stmt = $conn->prepare("
    SELECT COUNT(DISTINCT o.id) as total
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE p.seller_id = ?
");
$stmt->bind_param("i", $auth['user_id']);
$stmt->execute();
$totalOrders = $stmt->get_result()->fetch_assoc()['total'];

// Total sales
$stmt = $conn->prepare("
    SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE p.seller_id = ? AND o.status != 'cancelled'
");
$stmt->bind_param("i", $auth['user_id']);
$stmt->execute();
$totalSales = $stmt->get_result()->fetch_assoc()['total'];

// Recent orders
$stmt = $conn->prepare("
    SELECT DISTINCT o.*, u.full_name as customer_name
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON o.user_id = u.id
    WHERE p.seller_id = ?
    ORDER BY o.created_at DESC
    LIMIT 5
");
$stmt->bind_param("i", $auth['user_id']);
$stmt->execute();
$recentOrders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

respond([
    "total_products" => intval($totalProducts),
    "total_orders" => intval($totalOrders),
    "total_sales" => floatval($totalSales),
    "recent_orders" => $recentOrders
]);
