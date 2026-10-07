<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Forbidden"], 403);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

// Total users by role
$userStats = $conn->query("SELECT role, COUNT(*) as count FROM users GROUP BY role")->fetch_all(MYSQLI_ASSOC);

// Total products
$totalProducts = $conn->query("SELECT COUNT(*) as count FROM products")->fetch_assoc()['count'];
$activeProducts = $conn->query("SELECT COUNT(*) as count FROM products WHERE is_active = 1")->fetch_assoc()['count'];

// Total orders and revenue
$orderStats = $conn->query("SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue FROM orders")->fetch_assoc();

// Orders by status
$ordersByStatus = $conn->query("SELECT status, COUNT(*) as count FROM orders GROUP BY status")->fetch_all(MYSQLI_ASSOC);

// Recent orders (last 10)
$recentOrders = $conn->query("SELECT o.id, o.total_amount, o.status, o.created_at, u.full_name as buyer_name
    FROM orders o JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC LIMIT 10")->fetch_all(MYSQLI_ASSOC);

// Monthly revenue (last 6 months)
$monthlyRevenue = $conn->query("SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total_amount) as revenue, COUNT(*) as orders
    FROM orders
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month")->fetch_all(MYSQLI_ASSOC);

// Top selling products
$topProducts = $conn->query("SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as total_revenue
    FROM order_items oi JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id
    ORDER BY total_sold DESC
    LIMIT 5")->fetch_all(MYSQLI_ASSOC);

// Total categories
$totalCategories = $conn->query("SELECT COUNT(*) as count FROM categories")->fetch_assoc()['count'];

respond([
    "user_stats" => $userStats,
    "total_products" => (int)$totalProducts,
    "active_products" => (int)$activeProducts,
    "total_orders" => (int)$orderStats['total_orders'],
    "total_revenue" => (float)$orderStats['total_revenue'],
    "orders_by_status" => $ordersByStatus,
    "recent_orders" => $recentOrders,
    "monthly_revenue" => $monthlyRevenue,
    "top_products" => $topProducts,
    "total_categories" => (int)$totalCategories,
]);
