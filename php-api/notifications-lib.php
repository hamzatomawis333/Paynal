<?php
// In-app notification helpers shared by every endpoint that creates an event a
// user should see in the bell dropdown.
//
// Contract matches logPaymentEvent()/logSubscriptionPaymentEvent() in
// payments/gcash-workflow.php: creating a notification must never be able to
// fail the real action. A missing notification is a shrug; a dropped order or
// payment because the bell table hiccupped is a bug. Errors go to the log.

/**
 * Inserts one notification row for one user.
 *
 * Title/body/link are clamped to the column sizes so caller prose can never
 * overflow the schema into an exception.
 */
function notifyUser(
    mysqli $conn,
    int $userId,
    string $type,
    string $title,
    ?string $body = null,
    ?string $link = null,
    ?int $relatedId = null
): void {
    if ($userId <= 0 || !in_array($type, ['message', 'order', 'payment', 'subscription'], true)) {
        return;
    }

    try {
        $safeTitle = mb_substr($title, 0, 150, 'UTF-8');
        $safeBody = $body === null ? null : mb_substr($body, 0, 255, 'UTF-8');
        $safeLink = $link === null ? null : mb_substr($link, 0, 255, 'UTF-8');

        $stmt = $conn->prepare(
            "INSERT INTO notifications (user_id, type, title, body, link, related_id) VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param('issssi', $userId, $type, $safeTitle, $safeBody, $safeLink, $relatedId);
        $stmt->execute();
    } catch (Exception $e) {
        error_log('[notifications] notifyUser failed: ' . $e->getMessage());
    }
}

/**
 * Inserts the same notification for every active user with the given role.
 *
 * Used for seller_admin conversations, where any admin may open the thread:
 * pinging them all mirrors exactly who the messages UI lets in.
 */
function notifyRole(
    mysqli $conn,
    string $role,
    string $type,
    string $title,
    ?string $body = null,
    ?string $link = null,
    ?int $relatedId = null
): void {
    try {
        $stmt = $conn->prepare("SELECT id FROM users WHERE role = ? AND is_active = 1");
        $stmt->bind_param('s', $role);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        foreach ($rows as $row) {
            notifyUser($conn, (int)$row['id'], $type, $title, $body, $link, $relatedId);
        }
    } catch (Exception $e) {
        error_log('[notifications] notifyRole failed: ' . $e->getMessage());
    }
}

/** Reads a user's role, defaulting to 'buyer' for unknown ids. */
function notificationUserRole(mysqli $conn, int $userId): string
{
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    return $row['role'] ?? 'buyer';
}

/**
 * Notifies the recipient(s) of a newly posted conversation message.
 *
 * Routes mirror who the messages UI actually lets read each conversation:
 *   buyer_seller  -> the other participant only
 *   seller_admin   -> seller wrote: every admin (any admin can open the thread)
 *                     admin wrote: the seller who owns the thread
 *
 * $conversation needs id/buyer_id/seller_id/type - the row ensureMember()
 * already fetched in messages/index.php.
 */
function notifyConversationMessage(
    mysqli $conn,
    array $conversation,
    int $senderId,
    string $senderName,
    string $excerpt
): void {
    $convId = (int)$conversation['id'];
    $convType = (string)($conversation['type'] ?? 'buyer_seller');
    $buyerId = (int)$conversation['buyer_id'];
    $sellerId = (int)$conversation['seller_id'];

    $title = 'New message from ' . $senderName;
    $body = $excerpt !== '' ? $excerpt : 'Sent an image';

    if ($convType === 'seller_admin') {
        // Column roles are swapped in this type: buyer_id is the seller who
        // opened the thread and seller_id is the admin. So the two directions
        // are: seller wrote -> ping every admin; admin wrote -> ping the seller
        // who owns the thread (buyer_id), whoever the sender is.
        if ($buyerId === $senderId) {
            notifyRole(
                $conn,
                'admin',
                'message',
                $title,
                $body,
                '/admin/messages?conversation=' . $convId,
                $convId
            );
            return;
        }
        if ($buyerId > 0 && $buyerId !== $senderId) {
            notifyUser(
                $conn,
                $buyerId,
                'message',
                $title,
                $body,
                '/seller/messages?conversation=' . $convId,
                $convId
            );
        }
        return;
    }

    $recipientId = $buyerId === $senderId ? $sellerId : $buyerId;
    if ($recipientId <= 0 || $recipientId === $senderId) {
        return;
    }

    $base = match (notificationUserRole($conn, $recipientId)) {
        'admin' => '/admin',
        'seller' => '/seller',
        default => '/account',
    };
    notifyUser(
        $conn,
        $recipientId,
        'message',
        $title,
        $body,
        $base . '/messages?conversation=' . $convId,
        $convId
    );
}

/**
 * Marks a user's message notifications for one conversation as read.
 *
 * Called from messages/index.php GET next to the UPDATE that flips is_read on
 * the messages themselves, so opening the thread clears both badges together.
 */
function markConversationNotificationsRead(mysqli $conn, int $userId, int $conversationId): void
{
    try {
        $stmt = $conn->prepare(
            "UPDATE notifications SET is_read = 1
             WHERE user_id = ? AND type = 'message' AND related_id = ? AND is_read = 0"
        );
        $stmt->bind_param('ii', $userId, $conversationId);
        $stmt->execute();
    } catch (Exception $e) {
        error_log('[notifications] markConversationNotificationsRead failed: ' . $e->getMessage());
    }
}

/** Marks every unread notification of a user as read ("Mark all read"). */
function markAllNotificationsRead(mysqli $conn, int $userId): void
{
    $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
}

/** Marks one owned notification as read. Returns false when the row is not the caller's. */
function markNotificationRead(mysqli $conn, int $userId, int $notificationId): bool
{
    $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ? AND is_read = 0");
    $stmt->bind_param('ii', $notificationId, $userId);
    $stmt->execute();
    if ($stmt->affected_rows > 0) {
        return true;
    }
    // Already read is still "the caller owns it" - only a wrong id/user fails.
    $check = $conn->prepare("SELECT id FROM notifications WHERE id = ? AND user_id = ?");
    $check->bind_param('ii', $notificationId, $userId);
    $check->execute();
    return $check->get_result()->fetch_assoc() !== null;
}

/** Unread badge count for a user. */
function unreadNotificationCount(mysqli $conn, int $userId): int
{
    $stmt = $conn->prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    return (int)($row['c'] ?? 0);
}
