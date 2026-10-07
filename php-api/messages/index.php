<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../notifications-lib.php';

$auth = verifyToken();
$userId = (int)$auth['user_id'];
$role = $auth['role'];
$method = $_SERVER['REQUEST_METHOD'];

function ensureMember($conn, $conversationId, $userId, $role = '') {
    $stmt = $conn->prepare("SELECT id, buyer_id, seller_id, type FROM conversations WHERE id = ?");
    $stmt->bind_param("i", $conversationId);
    $stmt->execute();
    $c = $stmt->get_result()->fetch_assoc();
    if (!$c) respond(["error" => "Conversation not found"], 404);
    // Admin can access any seller_admin conversation; others must be a participant
    if ($role === 'admin' && $c['type'] === 'seller_admin') return $c;
    if ((int)$c['buyer_id'] !== $userId && (int)$c['seller_id'] !== $userId) {
        respond(["error" => "Forbidden"], 403);
    }
    return $c;
}

// GET ?conversation_id=X — list messages and mark as read
if ($method === 'GET') {
    $conversationId = intval($_GET['conversation_id'] ?? 0);
    if (!$conversationId) respond(["error" => "conversation_id required"], 400);
    ensureMember($conn, $conversationId, $userId, $role);

    // Mark messages from the OTHER user as read
    $stmt = $conn->prepare("UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?");
    $stmt->bind_param("ii", $conversationId, $userId);
    $stmt->execute();

    // The bell badge follows the same rule: opening the thread clears its
    // notifications, exactly like it clears the message unread counts.
    markConversationNotificationsRead($conn, $userId, $conversationId);

    $stmt = $conn->prepare("
        SELECT m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.is_read, m.created_at,
            u.full_name AS sender_name, u.avatar_url AS sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ?
        ORDER BY m.id ASC
    ");
    $stmt->bind_param("i", $conversationId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    respond(["messages" => $rows]);
}

// POST — send a new message { conversation_id, body, image_url? }
if ($method === 'POST') {
    $data = getBody();
    $conversationId = intval($data['conversation_id'] ?? 0);
    $body = trim((string)($data['body'] ?? ''));
    $imageUrl = trim((string)($data['image_url'] ?? ''));

    if (!$conversationId) respond(["error" => "conversation_id required"], 400);
    if ($body === '' && $imageUrl === '') respond(["error" => "Message must have text or an image"], 400);
    if (mb_strlen($body) > 2000) respond(["error" => "Message too long"], 400);

    $conversation = ensureMember($conn, $conversationId, $userId, $role);

    $stmt = $conn->prepare("INSERT INTO messages (conversation_id, sender_id, body, image_url) VALUES (?, ?, ?, ?)");
    $nullIfEmpty = $imageUrl !== '' ? $imageUrl : null;
    $stmt->bind_param("iiss", $conversationId, $userId, $body, $nullIfEmpty);
    $stmt->execute();
    $newId = $conn->insert_id;

    $stmt = $conn->prepare("UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->bind_param("i", $conversationId);
    $stmt->execute();

    // Bell notification for the recipient(s) - never for the sender, and never
    // on a failure: the message itself is already stored.
    $nameStmt = $conn->prepare("SELECT full_name FROM users WHERE id = ?");
    $nameStmt->bind_param("i", $userId);
    $nameStmt->execute();
    $senderName = (string)($nameStmt->get_result()->fetch_assoc()['full_name'] ?? 'Someone');
    notifyConversationMessage(
        $conn,
        $conversation,
        $userId,
        $senderName,
        $body !== '' ? mb_substr($body, 0, 120, 'UTF-8') : ''
    );

    respond(["success" => true, "message_id" => $newId], 201);
}

respond(["error" => "Method not allowed"], 405);
