<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$auth = verifyToken();

$stmt = $conn->prepare("SELECT id, full_name, email, role, phone, address, avatar_url FROM users WHERE id = ?");
$stmt->bind_param("i", $auth['user_id']);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user) respond(["error" => "User not found"], 404);

respond(["user" => $user]);
