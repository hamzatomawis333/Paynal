<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../payments/gcash-workflow.php';

// The subscription price is whatever the admin last set in platform settings
// (see platformSubscriptionPrice()); the amount is stored on each row at
// creation time so the admin verifies against exactly what the seller saw.
const SUBSCRIPTION_DAYS = 30;

$auth = verifyToken();
if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);

$sellerId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET: Get seller's subscription status + payment snapshot
if ($method === 'GET') {
    $stmt = $conn->prepare("
        SELECT ss.*, au.full_name AS approved_by_name,
            (SELECT c.id FROM conversations c
             WHERE c.buyer_id = ss.seller_id AND c.product_id IS NULL AND c.type = 'seller_admin'
             ORDER BY c.id ASC LIMIT 1) AS conversation_id
        FROM seller_subscriptions ss
        LEFT JOIN users au ON ss.approved_by = au.id
        WHERE ss.seller_id = ?
        ORDER BY ss.created_at DESC
        LIMIT 1
    ");
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $sub = $stmt->get_result()->fetch_assoc();

    // Auto-expire if end_date has passed
    if ($sub && $sub['status'] === 'Active' && $sub['end_date'] && strtotime($sub['end_date']) < time()) {
        $update = $conn->prepare("UPDATE seller_subscriptions SET status = 'Expired', updated_at = NOW() WHERE id = ?");
        $update->bind_param("i", $sub['id']);
        $update->execute();
        $sub['status'] = 'Expired';
    }

    $hasActive = ($sub && $sub['status'] === 'Active');

    // The destination number is only meaningful while there is a live payment
    // to make; an Active/Expired/Rejected subscription never shows it.
    $gcashNumber = '';
    if ($sub && $sub['status'] === 'Pending') {
        $gcashNumber = platformGcashNumber($conn);
    }

    respond([
        "subscription" => $sub,
        "has_active_subscription" => $hasActive,
        "gcash_number" => $gcashNumber,
        // Current platform-wide price: what the next subscription will cost.
        "subscription_price" => platformSubscriptionPrice($conn),
    ]);
}

// POST: Start a subscription + its pending GCash payment
if ($method === 'POST') {
    // A live request or an active plan blocks a second one, exactly as before.
    $check = $conn->prepare("SELECT id, status FROM seller_subscriptions WHERE seller_id = ? AND status IN ('Pending', 'Active') ORDER BY created_at DESC LIMIT 1");
    $check->bind_param("i", $sellerId);
    $check->execute();
    $existing = $check->get_result()->fetch_assoc();

    if ($existing) {
        if ($existing['status'] === 'Active') {
            respond(["error" => "You already have an active subscription"], 400);
        }
        respond(["error" => "You already have a pending subscription request"], 400);
    }

    // Fail fast when the platform has no destination number, mirroring checkout
    // refusing to place an order when a seller has no GCash number. Otherwise
    // the seller could submit a reference with nowhere to send the money.
    $gcashNumber = platformGcashNumber($conn);
    if ($gcashNumber === '') {
        respond(["error" => "Subscription payments are not configured yet. Please message the admin to set up the GCash number."], 409);
    }

    $conversationId = null;
    $price = platformSubscriptionPrice($conn);

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("INSERT INTO seller_subscriptions (seller_id, status, payment_status, payment_amount) VALUES (?, 'Pending', 'pending', ?)");
        $stmt->bind_param("id", $sellerId, $price);
        $stmt->execute();
        $subId = (int)$stmt->insert_id;

        logSubscriptionPaymentEvent(
            $conn,
            $subId,
            $sellerId,
            'seller',
            'submitted',
            null,
            'pending',
            'Subscription request created with a ' . gcash_money($price) . ' payment.',
            null
        );

        $conversationId = ensureSellerAdminConversation($conn, $sellerId);
        if ($conversationId !== null && $conversationId > 0) {
            postSystemMessage($conn, $conversationId, $sellerId, buildSubscriptionPaymentInquiry($price, $gcashNumber));
        }

        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        respond(["error" => "Failed to create subscription request"], 500);
    }

    respond([
        "success" => true,
        "subscription_id" => $subId,
        "payment_status" => 'pending',
        "payment_amount" => $price,
        "gcash_number" => $gcashNumber,
        "conversation_id" => $conversationId,
    ], 201);
}

respond(["error" => "Method not allowed"], 405);
