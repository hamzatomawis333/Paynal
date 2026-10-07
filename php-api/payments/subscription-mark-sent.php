<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/gcash-workflow.php';
require_once __DIR__ . '/../notifications-lib.php';

// POST - seller marks their subscription GCash payment as "sent".
//
// The exact same shape as payments/mark-sent.php, with the seller as payer and
// the admin as verifier: this NEVER activates the subscription. It only moves
// pending -> awaiting_confirmation and asks the admin to check their GCash.
// Activating is subscriptions' equivalent of confirm.php and only an admin may
// call it.
//
// Also reopenable: a rejected payment can be resubmitted with a new reference,
// because the usual rejection cause (mistyped reference, wrong number) is a
// fixable mistake. The subscription itself stays 'Pending' throughout.
//
// Idempotent: a second call returns the current state instead of erroring.

$auth = verifyToken();
$sellerId = (int)$auth['user_id'];

if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$body = getBody();
$subId = (int)($body['subscription_id'] ?? 0);
if (!$subId) respond(["error" => "subscription_id is required"], 400);

$stmt = $conn->prepare("SELECT id, seller_id, status, payment_status, payment_amount, transaction_reference FROM seller_subscriptions WHERE id = ?");
$stmt->bind_param("i", $subId);
$stmt->execute();
$sub = $stmt->get_result()->fetch_assoc();
if (!$sub) respond(["error" => "Subscription not found"], 404);

// Authorisation is on the subscription owner, not a client-supplied seller_id,
// so an unauthorised caller always gets 403 before any payload validation.
if ((int)$sub['seller_id'] !== $sellerId) respond(["error" => "Forbidden"], 403);

// The GCash reference is the only shared evidence that money moved, so it is
// the basis of the admin's verification. Required, same rules as the buyer flow.
$reference = data_string($body, 'transaction_reference', 100);

if ($reference === '') {
    respond([
        "error" => "GCash reference number is required",
        "field" => "transaction_reference",
    ], 400);
}

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

$current = $sub['payment_status'];
$wasRejected = $current === 'rejected';

if ($current === 'awaiting_confirmation') {
    respond(["success" => true, "already_marked" => true, "status" => 'awaiting_confirmation', "subscription_id" => $subId]);
}
if ($current === 'completed') {
    respond(["error" => "This subscription payment is already confirmed."], 409);
}
if ($current !== 'pending' && !$wasRejected) {
    respond(["error" => "This payment is not awaiting confirmation."], 409);
}

// A brand-new request must still be 'Pending' on the subscription side;
// a completed/expired/rejected subscription has no live payment to submit.
if ($sub['status'] !== 'Pending') {
    respond(["error" => "This subscription is no longer awaiting payment."], 409);
}

$conn->begin_transaction();
try {
    // Re-check under the row lock: two rapid clicks could both pass the guards.
    $lockStmt = $conn->prepare("SELECT status, payment_status, transaction_reference FROM seller_subscriptions WHERE id = ? FOR UPDATE");
    $lockStmt->bind_param("i", $subId);
    $lockStmt->execute();
    $locked = $lockStmt->get_result()->fetch_assoc();
    $lockedStatus = $locked ? (string)$locked['payment_status'] : (string)$current;
    if (!$locked || (string)$locked['status'] !== 'Pending'
        || ($lockedStatus !== 'pending' && $lockedStatus !== 'rejected')) {
        $conn->rollback();
        respond(["success" => true, "already_marked" => true, "status" => $lockedStatus, "subscription_id" => $subId]);
    }

    $upd = $conn->prepare("UPDATE seller_subscriptions SET payment_status = 'awaiting_confirmation', transaction_reference = ?, updated_at = NOW() WHERE id = ?");
    $upd->bind_param("si", $reference, $subId);
    $upd->execute();

    logSubscriptionPaymentEvent(
        $conn,
        $subId,
        $sellerId,
        'seller',
        $lockedStatus === 'rejected' ? 'resubmitted' : 'submitted',
        $lockedStatus,
        'awaiting_confirmation',
        $lockedStatus === 'rejected'
            ? 'Seller resubmitted after rejection. Previously submitted reference: ' . (string)($locked['transaction_reference'] ?? 'none')
            : null,
        $reference
    );

    // Tell the admin in the seller<->admin conversation they already share.
    $convId = ensureSellerAdminConversation($conn, $sellerId);
    if ($convId !== null && $convId > 0) {
        $amount = gcash_money((float)$sub['payment_amount']);
        if ($lockedStatus === 'rejected') {
            $msg = "I sent the subscription payment of " . $amount . " again."
                . "\nNew GCash reference: " . $reference
                . "\n(The reference I gave before was " . (string)($locked['transaction_reference'] ?? 'none') . ".)"
                . "\nPlease check your GCash and confirm when you receive it.";
        } else {
            $msg = "I have sent the subscription payment of " . $amount . "."
                . "\nGCash reference: " . $reference
                . "\nPlease check your GCash for that reference and confirm when you receive it.";
        }
        postSystemMessage($conn, $convId, $sellerId, $msg);
    }

    // The admin used to discover a seller's subscription payment only by
    // opening the Subscriptions list. Ping every admin with the reference so
    // verification starts from the bell. Inside the transaction.
    $nameStmt = $conn->prepare("SELECT full_name FROM users WHERE id = ?");
    $nameStmt->bind_param("i", $sellerId);
    $nameStmt->execute();
    $sellerName = (string)($nameStmt->get_result()->fetch_assoc()['full_name'] ?? 'A seller');
    notifyRole(
        $conn,
        'admin',
        'subscription',
        'Subscription payment submitted',
        $sellerName . ' sent ' . gcash_money((float) $sub['payment_amount'])
            . '. Reference: ' . $reference
            . ($lockedStatus === 'rejected' ? ' (resubmitted after rejection)' : '')
            . '. Confirm or reject it in Subscriptions.',
        '/admin/subscriptions',
        $subId
    );

    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    respond(["error" => "Could not update the payment"], 500);
}

respond([
    "success" => true,
    "status" => 'awaiting_confirmation',
    "subscription_id" => $subId,
    "resubmitted" => $wasRejected,
]);
