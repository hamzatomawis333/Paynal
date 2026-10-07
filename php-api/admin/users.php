<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../audit-lib.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Forbidden"], 403);

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all users
if ($method === 'GET') {
    $limitRaw = (string) ($_GET['limit'] ?? '');
    $limit = 0;
    if ($limitRaw !== '') {
        $limit = intval($limitRaw);
        if ($limit < 1 || $limit > 500) {
            respond(["error" => "limit must be between 1 and 500"], 400);
        }
    }

    $total = (int) ($conn->query("SELECT COUNT(*) AS n FROM users")->fetch_assoc()['n'] ?? 0);

    $sql = "SELECT id, full_name, email, role, phone, address, avatar_url, is_active, created_at FROM users ORDER BY created_at DESC";
    if ($limit > 0) {
        $stmt = $conn->prepare($sql . " LIMIT ?");
        $stmt->bind_param("i", $limit);
        $stmt->execute();
        $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } else {
        $users = $conn->query($sql)->fetch_all(MYSQLI_ASSOC);
    }

    respond(["users" => $users, "total" => $total]);
}

// PUT - Update user (role, is_active)
if ($method === 'PUT') {
    $body = getBody();
    $userId = intval($body['user_id'] ?? 0);
    if (!$userId) respond(["error" => "user_id required"], 400);

    $stmt = $conn->prepare("SELECT role, is_active FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $before = $stmt->get_result()->fetch_assoc();
    if (!$before) respond(["error" => "User not found"], 404);

    $updates = [];
    $params = [];
    $types = "";
    $changes = [];

    if (isset($body['role'])) {
        $updates[] = "role = ?";
        $params[] = $body['role'];
        $types .= "s";
        $changes['role'] = ['from' => $before['role'], 'to' => $body['role']];
    }
    if (isset($body['is_active'])) {
        $updates[] = "is_active = ?";
        $params[] = (int)$body['is_active'];
        $types .= "i";
        $changes['is_active'] = ['from' => (int) $before['is_active'], 'to' => (int) $body['is_active']];
    }

    if (empty($updates)) respond(["error" => "Nothing to update"], 400);

    $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $params[] = $userId;
    $types .= "i";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();

    logAdminAudit($conn, $auth['user_id'], 'user.update', 'user', $userId, $changes);

    respond(["success" => true, "message" => "User updated"]);
}

// DELETE - Delete user
if ($method === 'DELETE') {
    $body = getBody();
    $userId = intval($body['user_id'] ?? 0);
    if (!$userId) respond(["error" => "user_id required"], 400);

    // Don't allow deleting self
    if ($userId == $auth['user_id']) respond(["error" => "Cannot delete yourself"], 400);

    $stmt = $conn->prepare("SELECT full_name, email, role FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $target = $stmt->get_result()->fetch_assoc();
    if (!$target) respond(["error" => "User not found"], 404);

    // FKs on orders/products/payments/messages cascade from users, so a hard
    // delete would silently erase financial history. Accounts with order
    // history must be deactivated instead (the is_active toggle).
    $stmt = $conn->prepare(
        "SELECT
            (SELECT COUNT(*) FROM orders WHERE user_id = ?) +
            (SELECT COUNT(*) FROM order_items WHERE seller_id = ?) AS linked"
    );
    $stmt->bind_param("ii", $userId, $userId);
    $stmt->execute();
    $linked = (int) ($stmt->get_result()->fetch_assoc()['linked'] ?? 0);

    if ($linked > 0) {
        logAdminAudit($conn, $auth['user_id'], 'user.delete_blocked', 'user', $userId, [
            'email' => $target['email'],
            'linked_orders' => $linked,
        ]);
        respond([
            "error" => "This account has order history and can't be deleted without erasing records. Deactivate it instead (toggle its status).",
            "hint" => "deactivate",
        ], 409);
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();

    logAdminAudit($conn, $auth['user_id'], 'user.delete', 'user', $userId, [
        'email' => $target['email'],
        'role' => $target['role'],
    ]);

    respond(["success" => true, "message" => "User deleted"]);
}

respond(["error" => "Method not allowed"], 405);
