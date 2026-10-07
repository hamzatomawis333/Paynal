<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/gcash-workflow.php';

// POST - admin rejects a subscription payment they could not verify.
//
// The subscription is NOT rejected: payment_status becomes 'rejected' while
// status stays 'Pending', so the seller can fix the mistake and resubmit a new
// reference through payments/subscription-mark-sent.php. Exactly the buyer
// flow's rejection semantics.
//
// Business rejection of the seller themselves (eligibility) is a different
// action and still lives in admin/subscriptions.php ('reject').
//
// Only an admin may call it, and only from awaiting_confirmation.

$auth = verifyToken();
$adminId = (int)$auth['user_id'];

if ($auth['role'] !== 'admin') respond(["error" => "Admin access required"], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$body = getBody();
$subId = (int)($body['subscription_id'] ?? 0);
if (!$subId) respond(["error" => "subscription_id is required"], 400);

$reason = data_string($body, 'reason', 255);
if ($reason === '') respond(["error" => "A reason is required so the seller knows what to fix"], 400);

// Fixed vocabulary keeps the seller-facing message consistent; "other" uses
// the admin's free text. Same vocabulary as payments/reject.php.
$reasonLabels = [
    'not_received'      => 'Payment not received.',
    'wrong_amount'      => 'Incorrect amount received.',
    'wrong_number'      => 'Payment was sent to the wrong GCash number.',
    'unverifiable'      => 'Transaction cannot be verified.',
];
$reasonKey = data_string($body, 'reason_code', 40);
$label = $reasonLabels[$reasonKey] ?? 'Payment not verified by admin.';
if ($reasonKey === 'other') {
    $label = 'Payment not verified: ' . $reason;
}

$stmt = $conn->prepare("SELECT id, seller_id, status, payment_status, payment_amount, transaction_reference FROM seller_subscriptions WHERE id = ?");
$stmt->bind_param("i", $subId);
$stmt->execute();
$sub = $stmt->get_result()->fetch_assoc();
if (!$sub) respond(["error" => "Subscription not found"], 404);

$current = (string)$sub['payment_status'];

if ($current === 'completed') {
    respond(["error" => "This payment is already confirmed and cannot be rejected."], 409);
}
if ($current === 'pending') {
    respond(["error" => "The seller has not marked this payment as sent yet."], 409);
}
if ($current === 'rejected') {
    respond(["success" => true, "already_rejected" => true, "status" => 'rejected', "subscription_id" => $subId]);
}
if ($current !== 'awaiting_confirmation') {
    respond(["error" => "This payment is not awaiting confirmation."], 409);
}
if ((string)$sub['status'] !== 'Pending') {
    respond(["error" => "This subscription is no longer awaiting payment."], 409);
}

$conn->begin_transaction();
try {
    $lockStmt = $conn->prepare("SELECT status, payment_status FROM seller_subscriptions WHERE id = ? FOR UPDATE");
    $lockStmt->bind_param("i", $subId);
    $lockStmt->execute();
    $locked = $lockStmt->get_result()->fetch_assoc();
    if (!$locked || (string)$locked['status'] !== 'Pending' || (string)$locked['payment_status'] !== 'awaiting_confirmation') {
        $conn->rollback();
        respond([
            "success" => true,
            "already_rejected" => ($locked['payment_status'] ?? '') === 'rejected',
            "status" => $locked['payment_status'] ?? $current,
            "subscription_id" => $subId,
        ]);
    }

    // Status (subscription lifecycle) deliberately untouched: the seller gets to
    // resubmit rather than starting over.
    $upd = $conn->prepare("UPDATE seller_subscriptions SET payment_status = 'rejected', payment_rejection_reason = ?, updated_at = NOW() WHERE id = ?");
    $upd->bind_param("si", $label, $subId);
    $upd->execute();

    logSubscriptionPaymentEvent(
        $conn,
        $subId,
        $adminId,
        'admin',
        'rejected',
        $current,
        'rejected',
        $label,
        $sub['transaction_reference']
    );

    $convId = ensureSellerAdminConversation($conn, (int)$sub['seller_id']);
    if ($convId !== null && $convId > 0) {
        postSystemMessage(
            $conn,
            $convId,
            $adminId,
            "I could not verify the subscription payment of " . gcash_money((float)$sub['payment_amount']) . ".\n\n"
            . $label . "\nPlease check your GCash transaction and send the correct reference again."
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
    "subscription_id" => $subId,
    "rejection_reason" => $label,
]);
