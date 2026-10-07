<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);

$sellerId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// POST: Start or get existing conversation with admin
if ($method === 'POST') {
    // Find the admin user (first admin in the system)
    $adminStmt = $conn->prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    $adminStmt->execute();
    $admin = $adminStmt->get_result()->fetch_assoc();

    if (!$admin) {
        respond(["error" => "No admin user found"], 404);
    }

    $adminId = (int)$admin['id'];

    if ($adminId === $sellerId) {
        respond(["error" => "Cannot message yourself"], 400);
    }

    // Check for existing seller_admin conversation
    $check = $conn->prepare("SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ? AND product_id IS NULL AND type = 'seller_admin'");
    // For seller_admin: buyer_id = seller (initiator), seller_id = admin
    $check->bind_param("ii", $sellerId, $adminId);
    $check->execute();
    $existing = $check->get_result()->fetch_assoc();

    if ($existing) {
        respond(["conversation_id" => (int)$existing['id'], "existing" => true]);
    }

    // Create new conversation
    // For seller_admin type: buyer_id = seller (the initiator), seller_id = admin
    $insert = $conn->prepare("INSERT INTO conversations (buyer_id, seller_id, product_id, type) VALUES (?, ?, NULL, 'seller_admin')");
    $insert->bind_param("ii", $sellerId, $adminId);
    $insert->execute();

    respond(["conversation_id" => $conn->insert_id, "existing" => false], 201);
}

respond(["error" => "Method not allowed"], 405);
