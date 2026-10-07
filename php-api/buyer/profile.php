<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
$userId = $auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET - Fetch buyer profile
if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT id, full_name, email, role, phone, address, avatar_url, created_at FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user) respond(["error" => "User not found"], 404);
    respond(["user" => $user]);
}

// PUT - Update profile or change password
if ($method === 'PUT') {
    $data = getBody();

    if (isset($data['action']) && $data['action'] === 'change_password') {
        $currentPassword = $data['current_password'] ?? '';
        $newPassword = $data['new_password'] ?? '';
        if (strlen($newPassword) < 6) respond(["error" => "New password must be at least 6 characters"], 400);

        $stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!password_verify($currentPassword, $row['password'])) respond(["error" => "Current password is incorrect"], 400);

        $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->bind_param("si", $hashed, $userId);
        $stmt->execute();
        respond(["success" => true, "message" => "Password changed successfully"]);
    }

    $fullName = trim($data['full_name'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address'] ?? '');
    if (!$fullName) respond(["error" => "Full name is required"], 400);

    $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?");
    $stmt->bind_param("sssi", $fullName, $phone, $address, $userId);
    $stmt->execute();

    // Update localStorage user
    $stmt = $conn->prepare("SELECT id, full_name, email, role, phone, address, avatar_url FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $updatedUser = $stmt->get_result()->fetch_assoc();

    respond(["success" => true, "message" => "Profile updated", "user" => $updatedUser]);
}

respond(["error" => "Method not allowed"], 405);
