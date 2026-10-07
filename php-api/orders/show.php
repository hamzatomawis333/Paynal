<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$auth = verifyToken();
$orderId = intval($_GET['id'] ?? 0);
if (!$orderId) respond(["error" => "Order ID required"], 400);

$stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $orderId, $auth['user_id']);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();

if (!$order) respond(["error" => "Order not found"], 404);

// Get items
$stmt = $conn->prepare("SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?");
$stmt->bind_param("i", $orderId);
$stmt->execute();
$order['items'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Get payment
$stmt = $conn->prepare("SELECT * FROM payments WHERE order_id = ?");
$stmt->bind_param("i", $orderId);
$stmt->execute();
$order['payment'] = $stmt->get_result()->fetch_assoc();

respond(["order" => $order]);
