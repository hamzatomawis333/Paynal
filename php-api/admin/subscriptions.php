<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Admin access required"], 403);

$adminId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET: List all subscriptions with seller info
if ($method === 'GET') {
    $filter = $_GET['status'] ?? '';

    $sql = "
        SELECT ss.*, u.full_name AS seller_name, u.email AS seller_email,
            au.full_name AS approved_by_name
        FROM seller_subscriptions ss
        JOIN users u ON ss.seller_id = u.id
        LEFT JOIN users au ON ss.approved_by = au.id
    ";
    $params = [];
    $types = '';

    if ($filter && in_array($filter, ['Pending', 'Active', 'Expired', 'Rejected'])) {
        $sql .= " WHERE ss.status = ?";
        $params[] = $filter;
        $types .= 's';
    }

    $sql .= " ORDER BY ss.created_at DESC";

    $stmt = $conn->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $subscriptions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    respond(["subscriptions" => $subscriptions]);
}

// PUT: Reject or expire a subscription (approval = payments/subscription-confirm.php)
if ($method === 'PUT') {
    $body = getBody();
    $subId = intval($body['id'] ?? 0);
    $action = trim($body['action'] ?? '');

    if (!$subId || !$action) {
        respond(["error" => "id and action required"], 400);
    }

    // Get current subscription
    $stmt = $conn->prepare("SELECT * FROM seller_subscriptions WHERE id = ?");
    $stmt->bind_param("i", $subId);
    $stmt->execute();
    $sub = $stmt->get_result()->fetch_assoc();

    if (!$sub) {
        respond(["error" => "Subscription not found"], 404);
    }

    // NOTE: there is deliberately no 'approve' action anymore. Approval now
    // happens ONLY through payments/subscription-confirm.php, which verifies
    // the GCash payment and activates the subscription in one transaction -
    // the same way orders can only become 'confirmed' via payments/confirm.php.

    if ($action === 'reject') {
        if ($sub['status'] !== 'Pending') {
            respond(["error" => "Only pending subscriptions can be rejected"], 400);
        }

        $reason = trim($body['reason'] ?? '');

        $update = $conn->prepare("UPDATE seller_subscriptions SET status = 'Rejected', rejection_reason = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?");
        $update->bind_param("sii", $reason, $adminId, $subId);
        $update->execute();

        respond(["success" => true, "message" => "Subscription rejected"]);
    }

    if ($action === 'expire') {
        $update = $conn->prepare("UPDATE seller_subscriptions SET status = 'Expired', updated_at = NOW() WHERE id = ?");
        $update->bind_param("i", $subId);
        $update->execute();

        respond(["success" => true, "message" => "Subscription marked as expired"]);
    }

    respond(["error" => "Invalid action. Use: reject or expire"], 400);
}

// DELETE: permanently remove a subscription record (storage cleanup).
// Active plans are protected - expire first, then delete - so a paid
// subscription can't be destroyed by a stray click.
if ($method === 'DELETE') {
    $body = getBody();
    $subId = intval($body['id'] ?? 0);

    if (!$subId) {
        respond(["error" => "id required"], 400);
    }

    $stmt = $conn->prepare("SELECT status FROM seller_subscriptions WHERE id = ?");
    $stmt->bind_param("i", $subId);
    $stmt->execute();
    $sub = $stmt->get_result()->fetch_assoc();

    if (!$sub) {
        respond(["error" => "Subscription not found"], 404);
    }

    if ($sub['status'] === 'Active') {
        respond(["error" => "Active subscriptions can't be deleted - mark it as expired first, then delete"], 409);
    }

    // payment_events rows cascade via FK; clear the related notifications too.
    $notes = $conn->prepare("DELETE FROM notifications WHERE type = 'subscription' AND related_id = ?");
    $notes->bind_param("i", $subId);
    $notes->execute();

    $del = $conn->prepare("DELETE FROM seller_subscriptions WHERE id = ?");
    $del->bind_param("i", $subId);
    $del->execute();

    respond(["success" => true, "message" => "Subscription deleted"]);
}

respond(["error" => "Method not allowed"], 405);
