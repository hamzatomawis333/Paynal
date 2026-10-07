<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/gcash-workflow.php';

// POST - seller rejects a payment they could not verify.
//
// The order is NOT confirmed. A rejection is NOT terminal: the buyer can
// resubmit a corrected reference (payments/mark-sent.php) and the seller can
// later confirm money that arrived after all (payments/confirm.php with a
// note). Every transition is recorded in payment_events.
//
// Only the owning seller may reject, and only from awaiting_confirmation.

$auth = verifyToken();
$sellerId = (int)$auth['user_id'];

if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$body = getBody();
$paymentId = (int)($body['payment_id'] ?? 0);
if (!$paymentId) respond(["error" => "payment_id is required"], 400);

$reason = data_string($body, 'reason', 255);
if ($reason === '') respond(["error" => "A reason is required so the buyer knows what to fix"], 400);

// Fixed vocabulary keeps the buyer-facing message consistent; "other" uses the
// seller's free text.
$reasonLabels = [
    'not_received'      => 'Payment not received.',
    'wrong_amount'      => 'Incorrect amount received.',
    'wrong_number'      => 'Payment was sent to the wrong GCash number.',
    'unverifiable'      => 'Transaction cannot be verified.',
];
$reasonKey = data_string($body, 'reason_code', 40);
$label = $reasonLabels[$reasonKey] ?? 'Payment not verified by seller.';
if ($reasonKey === 'other') {
    $label = 'Payment not verified: ' . $reason;
}

$stmt = $conn->prepare("SELECT pay.*, o.order_number FROM payments pay JOIN orders o ON o.id = pay.order_id WHERE pay.id = ?");
$stmt->bind_param("i", $paymentId);
$stmt->execute();
$payment = $stmt->get_result()->fetch_assoc();
if (!$payment) respond(["error" => "Payment not found"], 404);

if ($payment['seller_id'] === null || (int)$payment['seller_id'] !== $sellerId) {
    respond(["error" => "Forbidden"], 403);
}

$orderId = (int)$payment['order_id'];
$current = $payment['status'];

if ($current === 'completed') {
    respond(["error" => "This payment is already confirmed and cannot be rejected."], 409);
}
if ($current === 'pending') {
    respond(["error" => "The buyer has not marked this payment as sent yet."], 409);
}
if ($current === 'rejected') {
    respond(["success" => true, "already_rejected" => true, "status" => 'rejected', "payment_id" => $paymentId]);
}
if ($current !== 'awaiting_confirmation') {
    // refunded / failed: a plain reject is meaningless here, and without this
    // the lock check below would answer already_rejected with the wrong status.
    respond(["error" => "This payment is not awaiting confirmation."], 409);
}

$conn->begin_transaction();
try {
    $lockStmt = $conn->prepare("SELECT status FROM payments WHERE id = ? FOR UPDATE");
    $lockStmt->bind_param("i", $paymentId);
    $lockStmt->execute();
    $locked = $lockStmt->get_result()->fetch_assoc();
    if (!$locked || $locked['status'] !== 'awaiting_confirmation') {
        $conn->rollback();
        respond(["success" => true, "already_rejected" => true, "status" => $locked['status'] ?? $current, "payment_id" => $paymentId]);
    }

    $upd = $conn->prepare("UPDATE payments SET status = 'rejected', rejection_reason = ? WHERE id = ?");
    $upd->bind_param("si", $label, $paymentId);
    $upd->execute();

    logPaymentEvent(
        $conn,
        $paymentId,
        $sellerId,
        'seller',
        'rejected',
        (string)$current,
        'rejected',
        $label,
        $payment['transaction_reference']
    );

    $aggregate = refreshOrderPaymentStatus($conn, $orderId);

    $convId = $payment['conversation_id'] === null ? 0 : (int)$payment['conversation_id'];
    if ($convId > 0) {
        postSystemMessage(
            $conn,
            $convId,
            $sellerId,
            "I could not verify the GCash payment of " . gcash_money((float)$payment['amount']) . " for order " . $payment['order_number'] . ".\n\n" . $label . "\nPlease check your GCash transaction and send the correct amount."
        );
    }

    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    respond(["error" => "Could not reject the payment"], 500);
}

respond([
    "success" => true,
    "status" => 'rejected',
    "payment_id" => $paymentId,
    "rejection_reason" => $label,
    "order_payment_status" => $aggregate,
    "order_fully_paid" => $aggregate === 'paid',
]);