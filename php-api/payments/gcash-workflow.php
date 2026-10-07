<?php
/**
 * Shared logic for the manual GCash payment workflow.
 *
 * Every endpoint that touches a payment must agree on three things: which
 * seller a payment belongs to, what the whole order's payment status is, and
 * which conversation a payment request lives in. Keeping those rules here
 * stops the order-creation path and the confirm/reject path from drifting.
 */

if (!function_exists('gcash_digits')) {
    /**
     * Normalises a stored GCash number to digits.
     *
     * Registration and seller/profile.php both validate 10-15 digits, so the
     * value in the DB is already digits. This mirrors that rule: anything that
     * is not a plausible number is treated as "not configured" rather than
     * being echoed to a buyer as a destination to send money to.
     */
    function gcash_digits(?string $raw): string
    {
        $digits = preg_replace('/\D+/', '', (string) $raw);
        if ($digits === null || strlen($digits) < 10 || strlen($digits) > 15) {
            return '';
        }
        return $digits;
    }
}

/**
 * Appends one row to the payment_events audit trail.
 *
 * Deliberately does not throw. Auditing must never be able to fail a real
 * payment transition, so a broken trail degrades to a missing trail rather than
 * to a buyer whose money went unrecorded. Errors are left to MySQL to surface
 * in the log.
 */
function logPaymentEvent(
    mysqli $conn,
    int $paymentId,
    ?int $actorId,
    ?string $actorRole,
    string $eventType,
    ?string $fromStatus,
    ?string $toStatus,
    ?string $note = null,
    ?string $reference = null
): void {
    $stmt = $conn->prepare("INSERT INTO payment_events
        (payment_id, actor_id, actor_role, event_type, from_status, to_status, note, reference_snapshot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('iissssss', $paymentId, $actorId, $actorRole, $eventType, $fromStatus, $toStatus, $note, $reference);
    $stmt->execute();
}

/**
 * Recomputes orders.payment_status from that order's per-seller payment rows.
 *
 * Precedence matters: a single rejection must surface even when another
 * vendor has already paid, otherwise the buyer is told everything is fine
 * while one seller is still unpaid.
 *
 * @return string one of pending|awaiting_confirmation|paid|rejected
 */
function refreshOrderPaymentStatus(mysqli $conn, int $orderId): string
{
    $rows = $conn->query(
        "SELECT status FROM payments WHERE order_id = $orderId"
    )->fetch_all(MYSQLI_ASSOC);

    // Legacy order-scoped payment rows have seller_id = NULL. They still count,
    // otherwise an old COD order would look unpaid forever.
    if (!$rows) {
        $aggregate = 'pending';
    } else {
        $statuses = array_column($rows, 'status');
        if (in_array('rejected', $statuses, true)) {
            $aggregate = 'rejected';
        } elseif ($statuses && count(array_filter($statuses, fn($s) => $s === 'completed')) === count($statuses)) {
            $aggregate = 'paid';
        } elseif (in_array('awaiting_confirmation', $statuses, true)) {
            $aggregate = 'awaiting_confirmation';
        } else {
            $aggregate = 'pending';
        }
    }

    // The order only leaves 'pending' once every seller has confirmed money.
    // Partial payment must not let the order advance to processing.
    $orderStatus = 'paid' === $aggregate ? 'confirmed' : null;
    if ($orderStatus !== null) {
        $stmt = $conn->prepare("UPDATE orders SET status = ?, payment_status = ? WHERE id = ? AND status NOT IN ('cancelled','delivered','shipped')");
        $stmt->bind_param('ssi', $orderStatus, $aggregate, $orderId);
        $stmt->execute();
    } else {
        $stmt = $conn->prepare("UPDATE orders SET payment_status = ? WHERE id = ?");
        $stmt->bind_param('si', $aggregate, $orderId);
        $stmt->execute();
    }

    return $aggregate;
}

/**
 * Returns the existing buyer<->seller conversation, creating it only if absent.
 *
 * MySQL unique indexes treat NULL as distinct, so
 * UNIQUE(buyer_id, seller_id, product_id, type) does NOT dedupe the
 * product_id = NULL case. messages/conversations.php relies on an explicit
 * SELECT-then-INSERT for the same reason; this mirrors it rather than trusting
 * INSERT IGNORE.
 *
 * Payment requests are order-scoped, so product_id is always NULL here: one
 * conversation per buyer/seller pair holds every order's payment traffic.
 */
function ensureBuyerSellerConversation(mysqli $conn, int $buyerId, int $sellerId): int
{
    $stmt = $conn->prepare("SELECT id FROM conversations
        WHERE buyer_id = ? AND seller_id = ? AND product_id IS NULL AND type = 'buyer_seller'
        ORDER BY id ASC LIMIT 1");
    $stmt->bind_param('ii', $buyerId, $sellerId);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    if ($existing) {
        return (int) $existing['id'];
    }

    $stmt = $conn->prepare("INSERT INTO conversations (buyer_id, seller_id, product_id, type) VALUES (?, ?, NULL, 'buyer_seller')");
    $stmt->bind_param('ii', $buyerId, $sellerId);
    $stmt->execute();
    $conversationId = (int) $conn->insert_id;

    $stmt = $conn->prepare("UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->bind_param('i', $conversationId);
    $stmt->execute();

    return $conversationId;
}

/**
 * Posts a system-authored message into a conversation.
 *
 * sender_id is the buyer because the message is phrased as the buyer writing
 * to the seller, which keeps the conversation timeline in one direction and
 * matches how the seller-side UI renders "me vs them".
 */
function postSystemMessage(mysqli $conn, int $conversationId, int $senderId, string $body): void
{
    $stmt = $conn->prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)");
    $stmt->bind_param('iis', $conversationId, $senderId, $body);
    $stmt->execute();

    $stmt = $conn->prepare("UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?");
    $stmt->bind_param('i', $conversationId);
    $stmt->execute();
}

/** Formats a peso amount for message bodies. */
function gcash_money(float $amount): string
{
    return '₱' . number_format($amount, 2);
}

/**
 * Builds the automatic payment inquiry for one seller.
 *
 * Only that seller's products and only that seller's subtotal appear, so a
 * seller never sees another vendor's items, total, or GCash number.
 */
function buildPaymentInquiry(
    string $orderNumber,
    string $sellerName,
    string $gcashNumber,
    array $sellerItems,
    float $subtotal,
    float $shippingShare
): string {
    $lines = [];
    foreach ($sellerItems as $item) {
        $lines[] = sprintf(
            '- %s x%d  %s',
            $item['name'],
            (int) $item['quantity'],
            gcash_money((float) $item['subtotal'])
        );
    }

    return implode("\n", array_merge([
        "Hello! I placed a GCash order with your shop.",
        '',
        'Order: ' . $orderNumber,
        $sellerName,
        '',
        'Items:',
        implode("\n", $lines),
        sprintf('Subtotal: %s', gcash_money($subtotal)),
    ], $shippingShare > 0 ? [sprintf('Shipping share: %s', gcash_money($shippingShare))] : [], [
        sprintf('Amount to send: %s', gcash_money($subtotal + $shippingShare)),
        '',
        "I will send the payment to your registered GCash number:",
        $gcashNumber,
        '',
        'Please confirm once you receive the payment.',
        '',
        'Note: this payment is not verified automatically. It becomes confirmed',
        'only after you check your GCash and confirm it here.',
    ]));
}