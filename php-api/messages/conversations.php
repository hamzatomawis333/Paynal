<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
$userId = (int)$auth['user_id'];
$role = $auth['role'];
$method = $_SERVER['REQUEST_METHOD'];

// GET - list conversations for current user (buyer, seller, or admin)
if ($method === 'GET') {
    $typeFilter = $_GET['type'] ?? '';

    if ($role === 'admin') {
        // Admin sees ALL seller_admin conversations (not just their own)
        $stmt = $conn->prepare("
            SELECT c.id, c.buyer_id, c.seller_id, c.product_id, c.type, c.last_message_at, c.created_at,
                ub.full_name AS buyer_name, ub.avatar_url AS buyer_avatar,
                us.full_name AS seller_name, us.avatar_url AS seller_avatar,
                p.name AS product_name, p.image_url AS product_image,
                (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) AS unread_count
            FROM conversations c
            JOIN users ub ON c.buyer_id = ub.id
            JOIN users us ON c.seller_id = us.id
            LEFT JOIN products p ON c.product_id = p.id
            WHERE c.type = 'seller_admin'
            ORDER BY c.last_message_at DESC
        ");
        $stmt->bind_param("i", $userId);
    } else {
        // Buyer/Seller sees buyer_seller conversations (and seller_admin if seller)
        $sql = "
            SELECT c.id, c.buyer_id, c.seller_id, c.product_id, c.type, c.last_message_at, c.created_at,
                ub.full_name AS buyer_name, ub.avatar_url AS buyer_avatar,
                us.full_name AS seller_name, us.avatar_url AS seller_avatar,
                p.name AS product_name, p.image_url AS product_image,
                (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
                (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) AS unread_count
            FROM conversations c
            JOIN users ub ON c.buyer_id = ub.id
            JOIN users us ON c.seller_id = us.id
            LEFT JOIN products p ON c.product_id = p.id
            WHERE (c.buyer_id = ? OR c.seller_id = ?)
        ";
        $params = [$userId, $userId, $userId];
        $types = "iii";

        if ($role === 'seller' && !$typeFilter) {
            // Sellers see both buyer_seller and seller_admin conversations
            $sql .= " AND c.type IN ('buyer_seller', 'seller_admin')";
        } elseif ($typeFilter) {
            $sql .= " AND c.type = ?";
            $params[] = $typeFilter;
            $types .= "s";
        } else {
            $sql .= " AND c.type = 'buyer_seller'";
        }

        $sql .= " ORDER BY c.last_message_at DESC";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    respond(["conversations" => $rows]);
}

// POST - start (or get existing) conversation
if ($method === 'POST') {
    $data = getBody();
    $sellerId = intval($data['seller_id'] ?? 0);
    $productId = isset($data['product_id']) ? intval($data['product_id']) : null;
    $convType = trim($data['type'] ?? 'buyer_seller');

    // Validate type
    if (!in_array($convType, ['buyer_seller', 'seller_admin'])) {
        $convType = 'buyer_seller';
    }

    if ($convType === 'seller_admin') {
        // Seller starting chat with admin
        if ($role !== 'seller') respond(["error" => "Only sellers can start admin chat"], 403);

        $adminStmt = $conn->prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
        $adminStmt->execute();
        $admin = $adminStmt->get_result()->fetch_assoc();
        if (!$admin) respond(["error" => "No admin found"], 404);

        $adminId = (int)$admin['id'];
        if ($adminId === $userId) respond(["error" => "Cannot message yourself"], 400);

        // Check existing
        $check = $conn->prepare("SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ? AND product_id IS NULL AND type = 'seller_admin'");
        $check->bind_param("ii", $userId, $adminId);
        $check->execute();
        $existing = $check->get_result()->fetch_assoc();

        if ($existing) {
            respond(["conversation_id" => (int)$existing['id'], "existing" => true]);
        }

        $insert = $conn->prepare("INSERT INTO conversations (buyer_id, seller_id, product_id, type) VALUES (?, ?, NULL, 'seller_admin')");
        $insert->bind_param("ii", $userId, $adminId);
        $insert->execute();
        respond(["conversation_id" => $conn->insert_id, "existing" => false], 201);
    }

    // Standard buyer_seller flow
    if (!$sellerId) respond(["error" => "Seller ID required"], 400);
    if ($sellerId === $userId) respond(["error" => "Cannot message yourself"], 400);

    $buyerId = $userId;

    // Find existing
    if ($productId) {
        $stmt = $conn->prepare("SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ? AND product_id = ? AND type = 'buyer_seller'");
        $stmt->bind_param("iii", $buyerId, $sellerId, $productId);
    } else {
        $stmt = $conn->prepare("SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ? AND product_id IS NULL AND type = 'buyer_seller'");
        $stmt->bind_param("ii", $buyerId, $sellerId);
    }
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if ($row) {
        respond(["conversation_id" => (int)$row['id'], "existing" => true]);
    }

    $stmt = $conn->prepare("INSERT INTO conversations (buyer_id, seller_id, product_id, type) VALUES (?, ?, ?, 'buyer_seller')");
    $stmt->bind_param("iii", $buyerId, $sellerId, $productId);
    $stmt->execute();
    respond(["conversation_id" => $conn->insert_id, "existing" => false], 201);
}

// DELETE - delete a conversation and its messages
if ($method === 'DELETE') {
    $data = getBody();
    $conversationId = intval($data['id'] ?? 0);
    if (!$conversationId) respond(["error" => "conversation_id required"], 400);

    // Verify the user is a member (or admin for seller_admin conversations)
    $stmt = $conn->prepare("SELECT buyer_id, seller_id, type FROM conversations WHERE id = ?");
    $stmt->bind_param("i", $conversationId);
    $stmt->execute();
    $c = $stmt->get_result()->fetch_assoc();
    if (!$c) respond(["error" => "Conversation not found"], 404);

    $isMember = ((int)$c['buyer_id'] === $userId || (int)$c['seller_id'] === $userId);
    $isAdminType = ($role === 'admin' && $c['type'] === 'seller_admin');
    if (!$isMember && !$isAdminType) {
        respond(["error" => "Forbidden"], 403);
    }

    // Delete messages first, then the conversation
    $stmt = $conn->prepare("DELETE FROM messages WHERE conversation_id = ?");
    $stmt->bind_param("i", $conversationId);
    $stmt->execute();

    $stmt = $conn->prepare("DELETE FROM conversations WHERE id = ?");
    $stmt->bind_param("i", $conversationId);
    $stmt->execute();

    respond(["success" => true]);
}

respond(["error" => "Method not allowed"], 405);
