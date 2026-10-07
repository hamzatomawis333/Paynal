<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/notifications-lib.php';

// GET  -> recent notifications + unread badge count
// POST -> { action: "mark_read", id } | { action: "mark_all" }
//
// Auth is scoped to the caller's own rows: there is no way to read or clear
// another user's notifications, so this endpoint needs no admin gate.

$auth = verifyToken();
$userId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $limit = (int)($_GET['limit'] ?? 20);
    if ($limit < 1 || $limit > 50) {
        $limit = 20;
    }

    $stmt = $conn->prepare(
        "SELECT id, user_id, type, title, body, link, related_id, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT $limit"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    respond([
        'notifications' => $rows,
        'unread_count' => unreadNotificationCount($conn, $userId),
    ]);
}

if ($method === 'POST') {
    $data = getBody();
    $action = data_string($data, 'action', 32);

    if ($action === 'mark_read') {
        $id = (int)($data['id'] ?? 0);
        if (!$id) {
            respond(['error' => 'id is required'], 400);
        }
        if (!markNotificationRead($conn, $userId, $id)) {
            respond(['error' => 'Notification not found'], 404);
        }
        respond(['success' => true]);
    }

    if ($action === 'mark_all') {
        markAllNotificationsRead($conn, $userId);
        respond(['success' => true]);
    }

    respond(['error' => 'Unknown action'], 400);
}

respond(['error' => 'Method not allowed'], 405);
