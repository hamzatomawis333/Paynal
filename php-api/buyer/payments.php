<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
$userId = $auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') respond(["error" => "Method not allowed"], 405);

// Get all payments for buyer's orders
$stmt = $conn->prepare("SELECT p.*, o.order_number, o.status as order_status, o.total_amount, o.shipping_fee
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE o.user_id = ?
    ORDER BY p.created_at DESC");
$stmt->bind_param("i", $userId);
$stmt->execute();
$payments = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

respond(["payments" => $payments]);
