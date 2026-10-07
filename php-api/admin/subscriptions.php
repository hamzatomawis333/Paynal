<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../audit-lib.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Admin access required"], 403);

$adminId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET: List all subscriptions with seller info
if ($method === 'GET') {
    // Auto-expire first so this list never shows a stale Active row (only
    // the seller's own GET used to flip it, and only when they visited).
    // Mirrors the PHP check in seller/subscription.php:
    // strtotime(end_date) < time()  ==  end_date <= CURDATE().
    $conn->query(
        "UPDATE seller_subscriptions
         SET status = 'Expired', updated_at = NOW()
         WHERE status = 'Active'
           AND end_date IS NOT NULL AND end_date <> ''
           AND end_date <= CURDATE()"
    );

    $filter = $_GET['status'] ?? '';

    $fromSql = "
        FROM seller_subscriptions ss
        JOIN users u ON ss.seller_id = u.id
        LEFT JOIN users au ON ss.approved_by = au.id
    ";
    $whereSql = '';
    $params = [];
    $types = '';

    if ($filter && in_array($filter, ['Pending', 'Active', 'Expired', 'Rejected'])) {
        $whereSql = " WHERE ss.status = ?";
        $params[] = $filter;
        $types .= 's';
    }

    // Full filtered count (before ORDER BY / LIMIT) so the paginated UI can
    // show "showing X of Y".
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS n FROM seller_subscriptions ss
         JOIN users u ON ss.seller_id = u.id" . $whereSql
    );
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $total = (int) ($stmt->get_result()->fetch_assoc()['n'] ?? 0);

    $sql = "
        SELECT ss.*, u.full_name AS seller_name, u.email AS seller_email,
            au.full_name AS approved_by_name
    " . $fromSql . $whereSql . " ORDER BY ss.created_at DESC";

    $limitRaw = (string) ($_GET['limit'] ?? '');
    $limit = 0;
    if ($limitRaw !== '') {
        $limit = intval($limitRaw);
        if ($limit < 1 || $limit > 500) {
            respond(["error" => "limit must be between 1 and 500"], 400);
        }
        $sql .= " LIMIT ?";
        $params[] = $limit;
        $types .= 'i';
    }

    $stmt = $conn->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $subscriptions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    respond(["subscriptions" => $subscriptions, "total" => $total]);
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

        logAdminAudit($conn, $adminId, 'subscription.reject', 'subscription', $subId, [
            'seller_id' => (int) $sub['seller_id'],
            'reason' => $reason,
        ]);

        respond(["success" => true, "message" => "Subscription rejected"]);
    }

    if ($action === 'expire') {
        $update = $conn->prepare("UPDATE seller_subscriptions SET status = 'Expired', updated_at = NOW() WHERE id = ?");
        $update->bind_param("i", $subId);
        $update->execute();

        logAdminAudit($conn, $adminId, 'subscription.expire', 'subscription', $subId, [
            'seller_id' => (int) $sub['seller_id'],
        ]);

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

    $stmt = $conn->prepare("SELECT status, seller_id FROM seller_subscriptions WHERE id = ?");
    $stmt->bind_param("i", $subId);
    $stmt->execute();
    $sub = $stmt->get_result()->fetch_assoc();

    if (!$sub) {
        respond(["error" => "Subscription not found"], 404);
    }

    if ($sub['status'] === 'Active') {
        logAdminAudit($conn, $adminId, 'subscription.delete_blocked', 'subscription', $subId, [
            'seller_id' => (int) $sub['seller_id'],
        ]);
        respond(["error" => "Active subscriptions can't be deleted - mark it as expired first, then delete"], 409);
    }

    // payment_events rows cascade via FK; clear the related notifications too.
    $notes = $conn->prepare("DELETE FROM notifications WHERE type = 'subscription' AND related_id = ?");
    $notes->bind_param("i", $subId);
    $notes->execute();

    $del = $conn->prepare("DELETE FROM seller_subscriptions WHERE id = ?");
    $del->bind_param("i", $subId);
    $del->execute();

    logAdminAudit($conn, $adminId, 'subscription.delete', 'subscription', $subId, [
        'seller_id' => (int) $sub['seller_id'],
        'status' => $sub['status'],
    ]);

    respond(["success" => true, "message" => "Subscription deleted"]);
}

respond(["error" => "Method not allowed"], 405);
