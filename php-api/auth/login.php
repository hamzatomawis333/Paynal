<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(["error" => "Method not allowed", "hint" => "Send POST with JSON: {\"email\": \"...\", \"password\": \"...\"}"], 405);
}


$data = getBody();
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) respond(["error" => "Email and password are required"], 400);

$stmt = $conn->prepare("SELECT id, full_name, email, password_hash, role, phone, address, avatar_url FROM users WHERE email = ? AND is_active = 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user || !password_verify($password, $user['password_hash'])) {
    respond(["error" => "Invalid email or password"], 401);
}

$token = createToken($user['id'], $user['role']);
unset($user['password_hash']);

respond([
    "success" => true,
    "token" => $token,
    "user" => $user
]);
