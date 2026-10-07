<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/gcash-workflow.php';

// POST - seller confirms they received the GCash money.
//
// This is the ONLY transition to paid. Nothing in the system verifies GCash
// automatically, so this endpoint is deliberately the single manual gate.
//
// Only the seller who owns the payment may call it: a seller cannot confirm
// another seller's payment, and a buyer cannot mark their own payment paid.
//
// Two shapes of the same transition:
//   awaiting_confirmation -> completed  the ordinary case, no note needed.
//   rejected -> completed               the money turned up after the seller had
//                                       already rejected the payment (e.g. the
//                                       buyer sent the missing balance in chat).
//                                       A note is REQUIRED here so the audit
//                                       trail records why a rejection was
//                                       overturned.

$auth = verifyToken();
$sellerId = (int)$auth['user_id'];

if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$body = getBody();
$paymentId = (int)($body['payment_id'] ?? 0);
if (!$paymentId) respond(["error" => "payment_id is required"], 400);

// Required only for the rejected -> completed rescue (see below). Read before
// the status guards so the ordinary confirm path never has to send one.
$lateNote = data_string($body, 'note', 255);

$stmt = $conn->prepare("SELECT pay.*, o.order_number FROM payments pay JOIN orders o ON o.id = pay.order_id WHERE pay.id = ?");
$stmt->bind_param("i", $paymentId);
$stmt->execute();
$payment = $stmt->get_result()->fetch_assoc();
if (!$payment) respond(["error" => "Payment not found"], 404);

// Ownership check: the payment must belong to this seller.
if ($payment['seller_id'] === null || (int)$payment['seller_id'] !== $sellerId) {
    respond(["error" => "Forbidden"], 403);
}

$orderId = (int)$payment['order_id'];
$current = $payment['status'];

if ($current === 'completed') {
    // Idempotent: confirming twice is not an error, it just reports the state.
    respond(["success" => true, "already_confirmed" => true, "status" => 'completed', "payment_id" => $paymentId, "order_payment_status" => refreshOrderPaymentStatus($conn, $orderId)]);
}
if ($current === 'pending') {
    respond(["error" => "The buyer has not marked this payment as sent yet."], 409);
}

// Undoing your own rejection. Forbidding this left a paid order permanently
// stuck: the seller had rejected (often wrongly, or before the buyer sent the
// remainder), the buyer then sent the money, and nothing could move it forward.
if ($current === 'rejected' && $lateNote === '') {
    respond([
        "error" => "This payment was rejected. Add a note explaining how you received the money so the buyer can see what happened.",
        "field" => "note",
    ], 400);
}
if ($current !== 'rejected' && $current !== 'awaiting_confirmation') {
    respond(["error" => "This payment is not awaiting confirmation."], 409);
}

$wasRejected = $current === 'rejected';

$conn->begin_transaction();
try {
    $lockStmt = $conn->prepare("SELECT status, transaction_reference FROM payments WHERE id = ? FOR UPDATE");
    $lockStmt->bind_param("i", $paymentId);
    $lockStmt->execute();
    $locked = $lockStmt->get_result()->fetch_assoc();
    $lockedStatus = $locked ? (string)$locked['status'] : (string)$current;

    // Re-check the rescue precondition under the row lock too: another tab may
    // have already confirmed this while this request was in flight.
    if (!$locked || ($lockedStatus !== 'awaiting_confirmation' && $lockedStatus !== 'rejected')) {
        $conn->rollback();
        respond(["success" => true, "already_confirmed" => $lockedStatus === 'completed', "status" => $lockedStatus, "payment_id" => $paymentId]);
    }

    $upd = $conn->prepare("UPDATE payments SET status = 'completed', paid_at = CURRENT_TIMESTAMP, rejection_reason = NULL WHERE id = ?");
    $upd->bind_param("i", $paymentId);
    $upd->execute();

    // Keep the original rejection reason visible in the trail even though the
    // live row no longer carries it, otherwise an overturned rejection looks
    // like it never happened.
    $eventNote = $lateNote;
    if ($lockedStatus === 'rejected') {
        $wasReason = (string)($payment['rejection_reason'] ?? 'no reason recorded');
        $eventNote = $lateNote . ' (overturned a rejection: ' . $wasReason . ')';
    }

    logPaymentEvent(
        $conn,
        $paymentId,
        $sellerId,
        'seller',
        $lockedStatus === 'rejected' ? 'received_late' : 'confirmed',
        $lockedStatus,
        'completed',
        $eventNote !== '' ? $eventNote : null,
        $locked['transaction_reference'] ?? null
    );

    $aggregate = refreshOrderPaymentStatus($conn, $orderId);

    $convId = $payment['conversation_id'] === null ? 0 : (int)$payment['conversation_id'];
    if ($convId > 0) {
        if ($lockedStatus === 'rejected') {
            $message = "I have received the GCash payment of " . gcash_money((float)$payment['amount'])
                . " for order " . $payment['order_number'] . " after all, so I have marked it as paid."
                . "\n\n" . $lateNote;
        } else {
            $message = "Payment received and confirmed for order " . $payment['order_number'] . " (" . gcash_money((float)$payment['amount']) . "). Thank you!";
        }
        postSystemMessage($conn, $convId, $sellerId, $message);
    }

    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    respond(["error" => "Could not confirm the payment"], 500);
}

respond([
    "success" => true,
    "status" => 'completed',
    "payment_id" => $paymentId,
    // Tells the UI to say "received after all" rather than "confirmed".
    "recovered_from_rejection" => $wasRejected,
    "order_payment_status" => $aggregate,
    // Lets the UI explain that other sellers may still be unpaid.
    "order_fully_paid" => $aggregate === 'paid',
]);