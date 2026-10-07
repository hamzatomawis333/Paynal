<?php
// POST /orders/cancel.php {"order_id": N}
//
// The buyer ASKS to cancel their own order while it has not shipped yet.
// The order stays fully active (stock untouched) until a seller confirms the
// cancellation from their orders screen - money and stock only move when both
// sides agree. Allowed from pending / confirmed / processing; shipped,
// delivered and cancelled orders are locked. Every seller on the order gets an
// in-app notification.
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../notifications-lib.php';

$auth = verifyToken();
if ($auth['role'] !== 'buyer') respond(["error" => "Buyer access required"], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$buyerId = (int) $auth['user_id'];
$body = getBody();
$orderId = (int) ($body['order_id'] ?? 0);
if (!$orderId) respond(["error" => "order_id required"], 400);

$stmt = $conn->prepare("SELECT id, order_number, status, cancel_requested FROM orders WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $orderId, $buyerId);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();
if (!$order) respond(["error" => "Order not found"], 404);

// Idempotent: asking twice is a shrug, not an error.
if ((int) $order['cancel_requested'] === 1) {
    respond(["success" => true, "status" => $order['status'], "cancel_requested" => true, "already" => true]);
}

// The one rule: once it is on a truck, it cannot be backed out of here.
if (in_array($order['status'], ['shipped', 'delivered'], true)) {
    respond([
        "error" => "This order has already been prepared for shipping and can no longer be cancelled.",
        "status" => $order['status'],
    ], 409);
}
if ($order['status'] === 'cancelled') {
    respond(["success" => true, "status" => "cancelled", "cancel_requested" => false, "already" => true]);
}

// Flag only - status, stock and payments all stay exactly as they are until a
// seller confirms.
$stmt = $conn->prepare("UPDATE orders SET cancel_requested = 1, updated_at = NOW() WHERE id = ?");
$stmt->bind_param("i", $orderId);
$stmt->execute();

// Tell every seller on this order. DISTINCT keeps a seller with two
// products from being pinged twice.
$stmt = $conn->prepare(
    "SELECT DISTINCT seller_id FROM order_items WHERE order_id = ?"
);
$stmt->bind_param("i", $orderId);
$stmt->execute();
$sellerIds = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

foreach ($sellerIds as $row) {
    notifyUser(
        $conn,
        (int) $row['seller_id'],
        'order',
        'Cancellation requested for ' . $order['order_number'],
        'The buyer asked to cancel this order. Confirm it in your orders screen; the items return to your stock when you do.',
        '/seller/orders',
        $orderId
    );
}

respond(["success" => true, "status" => $order['status'], "cancel_requested" => true]);
