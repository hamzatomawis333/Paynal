<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../payments/gcash-workflow.php';

$auth = verifyToken();
if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);

$sellerId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET: List orders containing seller's products
if ($method === 'GET') {
    $stmt = $conn->prepare("
        SELECT DISTINCT o.*, u.full_name as customer_name, u.email as customer_email
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN users u ON o.user_id = u.id
        WHERE p.seller_id = ?
        ORDER BY o.created_at DESC
    ");
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $orders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // Get items for each order (only seller's products)
    $itemStmt = $conn->prepare("
        SELECT oi.*, p.name, p.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? AND p.seller_id = ?
    ");
    // Only THIS seller's payment row. The unique (order_id, seller_id) index
    // guarantees at most one, so a seller never sees a vendor's payment.
    $payStmt = $conn->prepare("
        SELECT pay.id, pay.amount, pay.status, pay.payment_method, pay.transaction_reference,
               pay.conversation_id, pay.rejection_reason, pay.paid_at, pay.created_at
        FROM payments pay
        WHERE pay.order_id = ? AND pay.seller_id = ?
        LIMIT 1
    ");
    $subStmt = $conn->prepare("SELECT COALESCE(SUM(subtotal),0) s FROM order_items WHERE order_id = ? AND seller_id = ?");

    foreach ($orders as &$order) {
        $oid = (int)$order['id'];

        $itemStmt->bind_param("ii", $oid, $sellerId);
        $itemStmt->execute();
        $order['items'] = $itemStmt->get_result()->fetch_all(MYSQLI_ASSOC);

        $subStmt->bind_param("ii", $oid, $sellerId);
        $subStmt->execute();
        $order['seller_subtotal'] = (float)$subStmt->get_result()->fetch_assoc()['s'];

        $payStmt->bind_param("ii", $oid, $sellerId);
        $payStmt->execute();
        $payment = $payStmt->get_result()->fetch_assoc();
        if ($payment) {
            $payment['id'] = (int)$payment['id'];
            $payment['amount'] = (float)$payment['amount'];
            $payment['conversation_id'] = $payment['conversation_id'] === null ? null : (int)$payment['conversation_id'];
        }
        $order['payment'] = $payment ?: null;
    }
    unset($order);

    respond(["orders" => $orders]);
}

// PUT: Update order status
if ($method === 'PUT') {
    $body = getBody();
    $orderId = intval($body['order_id'] ?? 0);
    $status = trim($body['status'] ?? '');

    if (!$orderId || !$status) respond(["error" => "Order ID and status required"], 400);

    // 'confirmed' was previously unreachable even though the column accepts it.
    // Confirmation is normally set automatically once every seller has
    // verified their payment, but allowing it here keeps the seller in control
    // of their own orders.
    $validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!in_array($status, $validStatuses, true)) respond(["error" => "Invalid status"], 400);

    // Verify seller has products in this order
    $check = $conn->prepare("
        SELECT o.id FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.id = ? AND p.seller_id = ?
        LIMIT 1
    ");
    $check->bind_param("ii", $orderId, $sellerId);
    $check->execute();
    if (!$check->get_result()->fetch_assoc()) respond(["error" => "Order not found"], 404);

    // An order must not advance to processing/shipped/delivered while money is
    // still unverified. 'cancelled' is always allowed.
    if (in_array($status, ['processing', 'shipped', 'delivered'], true)) {
        $paidCheck = $conn->prepare("
            SELECT COUNT(*) AS total, COALESCE(SUM(status = 'completed'), 0) AS completed
            FROM payments WHERE order_id = ? AND seller_id = ?
        ");
        $paidCheck->bind_param("ii", $orderId, $sellerId);
        $paidCheck->execute();
        $counts = $paidCheck->get_result()->fetch_assoc();

        // No payment rows at all means a non-GCash order (e.g. COD); those keep
        // the previous behaviour rather than being blocked forever.
        if ((int)$counts['total'] > 0 && (int)$counts['completed'] < (int)$counts['total']) {
            respond([
                "error" => "Payment must be confirmed before you can move this order to '$status'.",
                "payment_status" => ($counts['completed'] > 0) ? 'partially_paid' : 'awaiting_confirmation',
            ], 409);
        }
    }

    $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $orderId);

    if ($stmt->execute()) {
        respond(["success" => true, "status" => $status]);
    } else {
        respond(["error" => "Failed to update order"], 500);
    }
}

respond(["error" => "Method not allowed"], 405);
