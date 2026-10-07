<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(["error" => "Method not allowed", "hint" => "Send POST with JSON: {\"email\": \"...\", \"password\": \"...\"}"], 405);
}


$data = getBody();
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) respond(["error" => "Email and password are required"], 400);

// Brute-force throttle: 5 failed attempts per email or 30 per source IP in
// 15 minutes locks further attempts. Checked BEFORE verifying so a locked
// account can't be used to keep testing passwords.
$ip = substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45);
$failEmail = $conn->prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)");
$failEmail->bind_param("s", $email);
$failEmail->execute();
$emailFails = (int) ($failEmail->get_result()->fetch_assoc()['n'] ?? 0);

$failIp = $conn->prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)");
$failIp->bind_param("s", $ip);
$failIp->execute();
$ipFails = (int) ($failIp->get_result()->fetch_assoc()['n'] ?? 0);

if ($emailFails >= 5 || $ipFails >= 30) {
    respond([
        "error" => "Too many failed login attempts. Please wait 15 minutes and try again.",
    ], 429);
}

$stmt = $conn->prepare("SELECT id, full_name, email, password_hash, role, phone, address, avatar_url FROM users WHERE email = ? AND is_active = 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user || !password_verify($password, $user['password_hash'])) {
    $rec = $conn->prepare("INSERT INTO login_attempts (email, ip) VALUES (?, ?)");
    $rec->bind_param("ss", $email, $ip);
    $rec->execute();
    // Opportunistic cleanup so the table never grows unbounded.
    $conn->query("DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)");
    respond(["error" => "Invalid email or password"], 401);
}

// Success: clear the failure counter for this email.
$clear = $conn->prepare("DELETE FROM login_attempts WHERE email = ?");
$clear->bind_param("s", $email);
$clear->execute();

$token = createToken($user['id'], $user['role']);
unset($user['password_hash']);

respond([
    "success" => true,
    "token" => $token,
    "user" => $user
]);
