<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

$data = getBody();
$name     = trim($data['full_name'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$role     = $data['role'] ?? 'buyer';
$phone    = trim($data['phone'] ?? '');
$address  = trim($data['address'] ?? '');

// Shop details. Only meaningful for sellers; left NULL for buyers/admins.
$shopName    = trim($data['shop_name'] ?? '');
$shopAddress = trim($data['shop_address'] ?? '');
$gcash       = trim($data['gcash_number'] ?? '');

// Contact numbers are stored digits-only: spaces, dashes and a leading '+' are
// formatting, not data, and payouts are keyed on the digits.
$phoneDigits  = preg_replace('/\D+/', '', $phone);
$gcashDigits  = preg_replace('/\D+/', '', $gcash);

// Validation
if (!$name || !$email || !$password) respond(["error" => "Name, email, and password are required"], 400);
if (strlen($password) < 6) respond(["error" => "Password must be at least 6 characters"], 400);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(["error" => "Invalid email"], 400);
if (!in_array($role, ['buyer', 'seller'])) $role = 'buyer';

// Guard the column widths so oversized input returns a clear 400 instead of a
// database error surfacing as a 500.
if (mb_strlen($name) > 100) respond(["error" => "Name is too long (max 100 characters)"], 400);
if (mb_strlen($email) > 100) respond(["error" => "Email is too long (max 100 characters)"], 400);
if (mb_strlen($shopName) > 150) respond(["error" => "Shop name is too long (max 150 characters)"], 400);

// A vendor has to be reachable and has to be payable, so all five details are
// mandatory at signup rather than being chased afterwards.
if ($role === 'seller') {
    if ($phoneDigits === '' || strlen($phoneDigits) < 7 || strlen($phoneDigits) > 15) {
        respond(["error" => "A valid contact number is required for sellers"], 400);
    }
    if (!$address) respond(["error" => "An address is required for sellers"], 400);
    if (!$shopName) respond(["error" => "Shop name is required for sellers"], 400);
    if (!$shopAddress) respond(["error" => "Shop address is required for sellers"], 400);
    if (strlen($gcashDigits) < 10 || strlen($gcashDigits) > 15) {
        respond(["error" => "A valid GCash number is required for sellers"], 400);
    }
}

// Check existing
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) respond(["error" => "Email already registered"], 409);

// Create user
$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $conn->prepare("INSERT INTO users (full_name, email, password_hash, role, phone, address, shop_name, shop_address, gcash_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param(
    "sssssssss",
    $name,
    $email,
    $hash,
    $role,
    $phoneDigits,
    $address,
    $shopName,
    $shopAddress,
    $gcashDigits
);

if ($stmt->execute()) {
    $userId = $conn->insert_id;
    $token = createToken($userId, $role);
    respond([
        "success" => true,
        "token" => $token,
        "user" => [
            "id" => $userId,
            "full_name" => $name,
            "email" => $email,
            "role" => $role,
            "phone" => $phoneDigits,
            "address" => $address,
            "shop_name" => $shopName,
            "shop_address" => $shopAddress,
            "gcash_number" => $gcashDigits,
        ]
    ], 201);
} else {
    respond(["error" => "Registration failed"], 500);
}
