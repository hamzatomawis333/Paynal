<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/gcash-workflow.php';

// POST - admin confirms the subscription GCash payment was received.
//
// This is the ONLY path to an Active subscription now: it replaces the old
// free 'approve' action in admin/subscriptions.php, exactly the way
// payments/confirm.php is the only path to a paid order. Nothing verifies
// GCash automatically, so the admin checks their own GCash history against the
// submitted reference first.
//
// Two changes happen atomically (payments/confirm.php + the old approve in one
// transaction):
//   1. payment_status awaiting_confirmation -> completed (+ paid_at)
//   2. status Pending -> Active, start_date = today, end_date = +30 days
//
// Only an admin may call it, and only from awaiting_confirmation.

$auth = verifyToken();
$adminId = (int)$auth['user_id'];

if ($auth['role'] !== 'admin') respond(["error" => "Admin access required"], 403);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$body = getBody();
$subId = (int)($body['subscription_id'] ?? 0);
if (!$subId) respond(["error" => "subscription_id is required"], 400);

$note = data_string($body, 'note', 255);

$stmt = $conn->prepare("SELECT id, seller_id, status, payment_status, payment_amount, transaction_reference FROM seller_subscriptions WHERE id = ?");
$stmt->bind_param("i", $subId);
$stmt->execute();
$sub = $stmt->get_result()->fetch_assoc();
if (!$sub) respond(["error" => "Subscription not found"], 404);

$current = (string)$sub['payment_status'];

if ($current === 'completed') {
    // Idempotent: confirming twice is not an error, it just reports the state.
    respond(["success" => true, "already_confirmed" => true, "status" => 'completed', "subscription_id" => $subId]);
}
if ($current === 'pending') {
    respond(["error" => "The seller has not marked this payment as sent yet."], 409);
}
if ($current !== 'awaiting_confirmation') {
    respond(["error" => "This payment is not awaiting confirmation."], 409);
}
if ((string)$sub['status'] !== 'Pending') {
    respond(["error" => "This subscription is no longer awaiting approval."], 409);
}

$startDate = date('Y-m-d');
$endDate = date('Y-m-d', strtotime('+30 days'));

$conn->begin_transaction();
try {
    // Re-check under the row lock: another admin tab may have confirmed or
    // rejected this while the request was in flight.
    $lockStmt = $conn->prepare("SELECT status, payment_status, transaction_reference FROM seller_subscriptions WHERE id = ? FOR UPDATE");
    $lockStmt->bind_param("i", $subId);
    $lockStmt->execute();
    $locked = $lockStmt->get_result()->fetch_assoc();
    $lockedStatus = $locked ? (string)$locked['payment_status'] : (string)$current;
    $lockedSubStatus = $locked ? (string)$locked['status'] : (string)$sub['status'];

    if (!$locked || $lockedSubStatus !== 'Pending' || $lockedStatus !== 'awaiting_confirmation') {
        $conn->rollback();
        respond([
            "success" => true,
            "already_confirmed" => $lockedStatus === 'completed',
            "status" => $lockedStatus,
            "subscription_id" => $subId,
        ]);
    }

    $upd = $conn->prepare("UPDATE seller_subscriptions
        SET payment_status = 'completed',
            paid_at = CURRENT_TIMESTAMP,
            payment_rejection_reason = NULL,
            status = 'Active',
            start_date = ?,
            end_date = ?,
            approved_by = ?,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = ?");
    $upd->bind_param("ssii", $startDate, $endDate, $adminId, $subId);
    $upd->execute();

    logSubscriptionPaymentEvent(
        $conn,
        $subId,
        $adminId,
        'admin',
        'confirmed',
        $lockedStatus,
        'completed',
        $note !== '' ? $note : null,
        $locked['transaction_reference'] ?? null
    );

    // Tell the seller in the seller<->admin conversation: payment confirmed,
    // subscription active, and until when.
    $convId = ensureSellerAdminConversation($conn, (int)$sub['seller_id']);
    if ($convId !== null && $convId > 0) {
        $message = "Payment received and confirmed for your subscription ("
            . gcash_money((float)$sub['payment_amount']) . ")."
            . "\nYour subscription is now active until " . date('F j, Y', strtotime($endDate)) . ".";
        if ($note !== '') {
            $message .= "\n\n" . $note;
        }
        postSystemMessage($conn, $convId, $adminId, $message);
    }

    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();
    respond(["error" => "Could not confirm the payment"], 500);
}

respond([
    "success" => true,
    "status" => 'completed',
    "subscription_id" => $subId,
    "subscription_status" => 'Active',
    "start_date" => $startDate,
    "end_date" => $endDate,
]);
