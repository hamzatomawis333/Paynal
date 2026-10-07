<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Forbidden"], 403);

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all users
if ($method === 'GET') {
    $result = $conn->query("SELECT id, full_name, email, role, phone, address, avatar_url, is_active, created_at FROM users ORDER BY created_at DESC");
    $users = $result->fetch_all(MYSQLI_ASSOC);
    respond(["users" => $users]);
}

// PUT - Update user (role, is_active)
if ($method === 'PUT') {
    $body = getBody();
    $userId = $body['user_id'] ?? null;
    if (!$userId) respond(["error" => "user_id required"], 400);

    $updates = [];
    $params = [];
    $types = "";

    if (isset($body['role'])) {
        $updates[] = "role = ?";
        $params[] = $body['role'];
        $types .= "s";
    }
    if (isset($body['is_active'])) {
        $updates[] = "is_active = ?";
        $params[] = (int)$body['is_active'];
        $types .= "i";
    }

    if (empty($updates)) respond(["error" => "Nothing to update"], 400);

    $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
    $params[] = $userId;
    $types .= "i";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();

    respond(["success" => true, "message" => "User updated"]);
}

// DELETE - Delete user
if ($method === 'DELETE') {
    $body = getBody();
    $userId = $body['user_id'] ?? null;
    if (!$userId) respond(["error" => "user_id required"], 400);

    // Don't allow deleting self
    if ($userId == $auth['user_id']) respond(["error" => "Cannot delete yourself"], 400);

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();

    respond(["success" => true, "message" => "User deleted"]);
}

respond(["error" => "Method not allowed"], 405);
