<?php
require_once __DIR__ . '/../config.php';

// Public endpoint - no auth required
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') respond(["error" => "Method not allowed"], 405);

$result = $conn->query("SELECT id, name, code, description, icon FROM payment_methods WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
$methods = $result->fetch_all(MYSQLI_ASSOC);

respond(["payment_methods" => $methods]);
