<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();

$method = $_SERVER['REQUEST_METHOD'];

// GET: Get profile
if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT id, full_name, email, role, phone, address, shop_name, shop_address, gcash_number, avatar_url FROM users WHERE id = ?");
    $stmt->bind_param("i", $auth['user_id']);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user) respond(["error" => "User not found"], 404);

    // Get artisan profile if exists
    $stmt2 = $conn->prepare("SELECT specialty, story, location FROM artisan_profiles WHERE user_id = ?");
    $stmt2->bind_param("i", $auth['user_id']);
    $stmt2->execute();
    $artisan = $stmt2->get_result()->fetch_assoc();

    $user['artisan_profile'] = $artisan;
    respond(["user" => $user]);
}

// PUT: Update profile
if ($method === 'PUT') {
    $body = getBody();
    $action = $body['action'] ?? 'update_profile';

    if ($action === 'change_password') {
        $current = $body['current_password'] ?? '';
        $new = $body['new_password'] ?? '';

        if (!$current || !$new) respond(["error" => "Both passwords required"], 400);
        if (strlen($new) < 6) respond(["error" => "New password must be at least 6 characters"], 400);

        $stmt = $conn->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->bind_param("i", $auth['user_id']);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if (!$row || !password_verify($current, $row['password_hash'])) {
            respond(["error" => "Current password is incorrect"], 400);
        }

        $hashed = password_hash($new, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->bind_param("si", $hashed, $auth['user_id']);
        $stmt->execute();

        respond(["success" => true, "message" => "Password updated"]);
    }

    // Update profile info
    $full_name = trim($body['full_name'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $address = trim($body['address'] ?? '');
    $shop_name = trim($body['shop_name'] ?? '');
    $shop_address = trim($body['shop_address'] ?? '');
    $gcash_number = trim($body['gcash_number'] ?? '');

    if (!$full_name) respond(["error" => "Name is required"], 400);
    if (mb_strlen($full_name) > 100) respond(["error" => "Name is too long (max 100 characters)"], 400);
    if (mb_strlen($shop_name) > 150) respond(["error" => "Shop name is too long (max 150 characters)"], 400);

    // Same digits-only normalisation as registration, so the payout number
    // cannot drift into two different formats for the same seller.
    $phoneDigits = preg_replace('/\D+/', '', $phone);
    $gcashDigits = preg_replace('/\D+/', '', $gcash_number);

    // A seller must always keep a payable account on file.
    if ($auth['role'] === 'seller') {
        if (!$shop_name) respond(["error" => "Shop name is required"], 400);
        if (!$shop_address) respond(["error" => "Shop address is required"], 400);
        if (strlen($gcashDigits) < 10 || strlen($gcashDigits) > 15) {
            respond(["error" => "A valid GCash number is required"], 400);
        }
        if ($phoneDigits === '' || strlen($phoneDigits) < 7 || strlen($phoneDigits) > 15) {
            respond(["error" => "A valid contact number is required"], 400);
        }
    }

    $stmt = $conn->prepare("UPDATE users SET full_name=?, phone=?, address=?, shop_name=?, shop_address=?, gcash_number=? WHERE id=?");
    $stmt->bind_param("ssssssi", $full_name, $phoneDigits, $address, $shop_name, $shop_address, $gcashDigits, $auth['user_id']);
    $stmt->execute();

    // Update artisan profile if seller
    if ($auth['role'] === 'seller') {
        $specialty = trim($body['specialty'] ?? '');
        $story = trim($body['story'] ?? '');
        $location = trim($body['location'] ?? '');

        $check = $conn->prepare("SELECT id FROM artisan_profiles WHERE user_id = ?");
        $check->bind_param("i", $auth['user_id']);
        $check->execute();

        if ($check->get_result()->fetch_assoc()) {
            $stmt = $conn->prepare("UPDATE artisan_profiles SET specialty=?, story=?, location=? WHERE user_id=?");
            $stmt->bind_param("sssi", $specialty, $story, $location, $auth['user_id']);
        } else {
            $stmt = $conn->prepare("INSERT INTO artisan_profiles (user_id, specialty, story, location) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("isss", $auth['user_id'], $specialty, $story, $location);
        }
        $stmt->execute();
    }

    respond(["success" => true, "message" => "Profile updated"]);
}

respond(["error" => "Method not allowed"], 405);
