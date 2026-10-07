<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);

$sellerId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET: Get seller's subscription status
if ($method === 'GET') {
    $stmt = $conn->prepare("
        SELECT ss.*, au.full_name AS approved_by_name
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

    respond([
        "subscription" => $sub,
        "has_active_subscription" => $hasActive,
    ]);
}

// POST: Request a new subscription
if ($method === 'POST') {
    // Check if there's already a pending or active subscription
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

    $stmt = $conn->prepare("INSERT INTO seller_subscriptions (seller_id, status) VALUES (?, 'Pending')");
    $stmt->bind_param("i", $sellerId);

    if ($stmt->execute()) {
        respond(["success" => true, "subscription_id" => $stmt->insert_id], 201);
    } else {
        respond(["error" => "Failed to create subscription request"], 500);
    }
}

respond(["error" => "Method not allowed"], 405);
