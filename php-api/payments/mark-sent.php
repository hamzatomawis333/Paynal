<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/gcash-workflow.php';
require_once __DIR__ . '/../notifications-lib.php';

// POST - buyer marks one of their GCash payments as "sent".
//
// This NEVER marks the payment paid. It only moves pending -> awaiting_confirmation
// and asks the seller to check their GCash. Marking it paid is the seller's job
// (payments/confirm.php), which is the whole point of a manual workflow.
//
// Also reopenable: a rejected payment can be resubmitted with a new reference.
// A rejection is usually a fixable mistake (mistyped reference, wrong number),
// and permanently locking the buyer out meant the seller could never be paid
// even after the buyer sent the money correctly.
//
// Idempotent: a second call returns the current state instead of erroring or
// re-notifying, so a double click or a retry is harmless.

$auth = verifyToken();
$userId = (int)$auth['user_id'];

if ($auth['role'] !== 'buyer') respond(["error" => "Buyer access required"], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$body = getBody();
$paymentId = (int)($body['payment_id'] ?? 0);
if (!$paymentId) respond(["error" => "payment_id is required"], 400);

$stmt = $conn->prepare("SELECT pay.*, o.user_id AS buyer_id, o.order_number FROM payments pay JOIN orders o ON o.id = pay.order_id WHERE pay.id = ?");
$stmt->bind_param("i", $paymentId);
$stmt->execute();
$payment = $stmt->get_result()->fetch_assoc();
if (!$payment) respond(["error" => "Payment not found"], 404);

// Authorisation is on the order owner, not on a client-supplied buyer_id.
// Checked before validating the reference so an unauthorised caller always gets
// 403 rather than a hint about the payload shape.
if ((int)$payment['buyer_id'] !== $userId) respond(["error" => "Forbidden"], 403);

// REQUIRED. The GCash reference number is the only shared evidence that money
// moved, so it is the basis of the seller's verification. Without it the seller
// has nothing to match against their GCash history, which would make this a
// "claim payment" button rather than a real control. Requiring it keeps the
// manual workflow auditable.
$reference = data_string($body, 'transaction_reference', 100);

if ($reference === '') {
    respond([
        "error" => "GCash reference number is required",
        "field" => "transaction_reference",
    ], 400);
}

// GCash references are alphanumeric (commonly 13 digits) and are often pasted
// with spaces or dashes. Normalise those away, then reject anything that is not
// a plausible reference rather than storing arbitrary text.
$reference = preg_replace('/[\s-]+/', '', $reference);

if (preg_match('/^[A-Za-z0-9]+$/', $reference) !== 1) {
    respond([
        "error" => "GCash reference may only contain letters and numbers",
        "field" => "transaction_reference",
    ], 400);
}

if (strlen($reference) < 6 || strlen($reference) > 32) {
    respond([
        "error" => "GCash reference must be between 6 and 32 characters",
        "field" => "transaction_reference",
    ], 400);
}

$current = $payment['status'];
$orderId = (int)$payment['order_id'];

// A rejected payment is reopenable by the buyer, because the most common cause
// of a rejection is a fixable one: a typo'd reference, or money sent to the
// wrong number. Forbidding this left the buyer with no way to correct their own
// mistake and the seller with no way to ever be paid. The buyer only re-asserts
// their claim; the seller still has to verify it as usual, so this cannot move
// money on its own. rejection_reason is kept, and payment_events records that a
// resubmission happened and what the rejected reference was.
$wasRejected = $current === 'rejected';

if ($current === 'awaiting_confirmation') {
    respond(["success" => true, "already_marked" => true, "status" => 'awaiting_confirmation', "payment_id" => $paymentId]);
}
if ($current === 'completed') {
    respond(["error" => "This payment is already confirmed by the seller."], 409);
}
if ($current !== 'pending' && !$wasRejected) {
    respond(["error" => "This payment is not awaiting your confirmation."], 409);
}

$conn->begin_transaction();
try {
    // Re-check inside the transaction: two rapid clicks could both pass the
    // guard above before either committed.
    $lockStmt = $conn->prepare("SELECT status, transaction_reference FROM payments WHERE id = ? FOR UPDATE");
    $lockStmt->bind_param("i", $paymentId);
    $lockStmt->execute();
    $locked = $lockStmt->get_result()->fetch_assoc();
    $lockedStatus = $locked ? (string)$locked['status'] : (string)$current;
    if (!$locked || ($lockedStatus !== 'pending' && $lockedStatus !== 'rejected')) {
        $conn->rollback();
        respond(["success" => true, "already_marked" => true, "status" => $lockedStatus, "payment_id" => $paymentId]);
    }

    $upd = $conn->prepare("UPDATE payments SET status = 'awaiting_confirmation', transaction_reference = ? WHERE id = ?");
    $upd->bind_param("si", $reference, $paymentId);
    $upd->execute();

    logPaymentEvent(
        $conn,
        $paymentId,
        $userId,
        'buyer',
        $lockedStatus === 'rejected' ? 'resubmitted' : 'submitted',
        $lockedStatus,
        'awaiting_confirmation',
        $lockedStatus === 'rejected'
            ? 'Buyer resubmitted after rejection. Previously submitted reference: ' . (string)($locked['transaction_reference'] ?? 'none')
            : null,
        $reference
    );

    refreshOrderPaymentStatus($conn, $orderId);

    // Tell the seller in the conversation they already share with this buyer.
    $convId = $payment['conversation_id'] === null ? 0 : (int)$payment['conversation_id'];
    if ($convId > 0) {
        if ($lockedStatus === 'rejected') {
            $msg = "I sent the GCash payment of " . gcash_money((float)$payment['amount']) . " again for order " . $payment['order_number'] . "."
                . "\nNew GCash reference: " . $reference
                . "\n(The reference I gave before was " . (string)($locked['transaction_reference'] ?? 'none') . ".)"
                . "\nPlease check your GCash and confirm when you receive it.";
        } else {
            $msg = "I have sent the GCash payment of " . gcash_money((float)$payment['amount']) . "."
                . "\nGCash reference: " . $reference
                . "\nPlease check your GCash for that reference and confirm when you receive it.";
        }
        postSystemMessage($conn, $convId, $userId, $msg);
    }

    // The seller's "did the buyer actually pay?" check used to start at
    // manually opening the order. Ping them with the reference so verification
    // can happen from the bell. Inside the transaction: rolls back with it.
    notifyUser(
        $conn,
        (int) $payment['seller_id'],
        'payment',
        'Buyer submitted a GCash reference',
        'Order ' . $payment['order_number'] . ' - '
            . gcash_money((float) $payment['amount'])
            . ' claimed as paid. Reference: ' . $reference
            . ($wasRejected ? ' (resubmitted after rejection)' : '')
            . '. Verify it in your Orders list.',
        '/seller/orders',
        $paymentId
    );

    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    respond(["error" => "Could not update the payment"], 500);
}

respond([
    "success" => true,
    "status" => 'awaiting_confirmation',
    "payment_id" => $paymentId,
    "resubmitted" => $wasRejected,
    "order_payment_status" => refreshOrderPaymentStatus($conn, $orderId),
]);