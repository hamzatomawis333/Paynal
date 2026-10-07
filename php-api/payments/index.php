<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/gcash-workflow.php';

// GET - payment groups for one order.
//
// Visibility is role-scoped:
//   buyer  -> only their own order, and only every seller's group (they are
//             paying all of them and need each GCash number).
//   seller -> only the group belonging to that seller. A seller can never see
//             another vendor's GCash number, items or subtotal.
//   admin  -> full order.

$auth = verifyToken();
$userId = (int)$auth['user_id'];
$role = $auth['role'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$orderId = (int)($_GET['order_id'] ?? 0);
if (!$orderId) respond(["error" => "order_id is required"], 400);

$orderStmt = $conn->prepare("SELECT id, order_number, user_id, total_amount, shipping_fee, status, payment_method, payment_status FROM orders WHERE id = ?");
$orderStmt->bind_param("i", $orderId);
$orderStmt->execute();
$order = $orderStmt->get_result()->fetch_assoc();
if (!$order) respond(["error" => "Order not found"], 404);

if ($role === 'buyer' && (int)$order['user_id'] !== $userId) {
    respond(["error" => "Forbidden"], 403);
}
if ($role === 'seller') {
    // The seller must actually have items in this order, otherwise 404 rather
    // than 403 so the endpoint does not confirm the order exists.
    $own = $conn->prepare("SELECT 1 FROM order_items WHERE order_id = ? AND seller_id = ? LIMIT 1");
    $own->bind_param("ii", $orderId, $userId);
    $own->execute();
    if (!$own->get_result()->fetch_assoc()) respond(["error" => "Order not found"], 404);
}

$payStmt = $conn->prepare("
    SELECT pay.*,
           u.full_name AS seller_name,
           u.gcash_number AS seller_gcash,
           b.full_name AS buyer_name
    FROM payments pay
    LEFT JOIN users u ON u.id = pay.seller_id
    LEFT JOIN orders o ON o.id = pay.order_id
    LEFT JOIN users b ON b.id = o.user_id
    WHERE pay.order_id = ?
    ORDER BY pay.seller_id IS NULL, pay.seller_id, pay.id
");
$payStmt->bind_param("i", $orderId);
$payStmt->execute();
$rows = $payStmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Seller subtotals come from order_items, which is the authoritative record of
// what this seller is actually selling on this order.
$subStmt = $conn->prepare("SELECT COALESCE(SUM(subtotal),0) s FROM order_items WHERE order_id = ? AND seller_id = ?");
$itemStmt = $conn->prepare("
    SELECT oi.quantity, oi.unit_price, oi.subtotal, p.name, p.image_url
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ? AND oi.seller_id = ?
    ORDER BY oi.id
");

$groups = [];
foreach ($rows as $row) {
    $sellerId = $row['seller_id'] === null ? null : (int)$row['seller_id'];

    if ($role === 'seller' && $sellerId !== $userId) {
        continue; // never leak another vendor's group to a seller
    }

    $subtotal = 0.0;
    $items = [];
    if ($sellerId !== null) {
        $subStmt->bind_param("ii", $orderId, $sellerId);
        $subStmt->execute();
        $subtotal = (float)$subStmt->get_result()->fetch_assoc()['s'];

        $itemStmt->bind_param("ii", $orderId, $sellerId);
        $itemStmt->execute();
        foreach ($itemStmt->get_result()->fetch_all(MYSQLI_ASSOC) as $it) {
            $items[] = [
                'name'       => $it['name'],
                'image_url'  => $it['image_url'],
                'quantity'   => (int)$it['quantity'],
                'unit_price' => (float)$it['unit_price'],
                'subtotal'   => (float)$it['subtotal'],
            ];
        }
    }

    $amount = (float)$row['amount'];

    $groups[] = [
        'payment_id'      => (int)$row['id'],
        'seller_id'       => $sellerId,
        'seller_name'     => $row['seller_name'],
        // gcash_digits() re-validates on read, so a malformed legacy value is
        // reported as not-configured instead of being displayed to a buyer.
        'gcash_number'    => gcash_digits($row['seller_gcash']),
        'amount'          => $amount,
        'subtotal'        => $subtotal,
        'shipping_share'  => round($amount - $subtotal, 2),
        'status'          => $row['status'],
        'conversation_id' => $row['conversation_id'] === null ? null : (int)$row['conversation_id'],
        'transaction_reference' => $row['transaction_reference'],
        'rejection_reason' => $row['rejection_reason'],
        'paid_at'         => $row['paid_at'],
        'items'           => $items,
    ];
}

respond([
    "order" => [
        "id"             => (int)$order['id'],
        "order_number"   => $order['order_number'],
        "total_amount"   => (float)$order['total_amount'],
        "shipping_fee"   => (float)$order['shipping_fee'],
        "status"         => $order['status'],
        "payment_method" => $order['payment_method'],
        "payment_status" => $order['payment_status'],
    ],
    "buyer_name"     => ($rows[0]['buyer_name'] ?? null),
    "payment_groups" => $groups,
]);