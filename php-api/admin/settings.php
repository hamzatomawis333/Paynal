<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../payments/gcash-workflow.php';
require_once __DIR__ . '/../audit-lib.php';

$auth = verifyToken();
$method = $_SERVER['REQUEST_METHOD'];

// GET: platform settings. Any authenticated user may read the destination
// number (the seller's subscription page shows where to send the money via
// seller/subscription.php, but the admin edit form needs it too).
if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT `key`, `value` FROM platform_settings");
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['key']] = $row['value'];
    }

    respond([
        "settings" => [
            "gcash_number" => $settings['gcash_number'] ?? '',
            "subscription_price" => $settings['subscription_price'] ?? '299.00',
        ],
    ]);
}

// PUT: update platform settings (admin only). Each key is optional so a form
// that only edits one setting never wipes the other.
if ($method === 'PUT') {
    if ($auth['role'] !== 'admin') respond(["error" => "Admin access required"], 403);

    $body = getBody();
    $touched = false;
    $changes = [];

    // Snapshot the current values of any key in the request so the audit log
    // records old -> new instead of just "something changed".
    foreach (['gcash_number', 'subscription_price'] as $key) {
        if (array_key_exists($key, $body)) {
            $stmt = $conn->prepare("SELECT `value` FROM platform_settings WHERE `key` = ?");
            $stmt->bind_param("s", $key);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $changes[$key] = ['from' => $row['value'] ?? null];
        }
    }

    if (array_key_exists('gcash_number', $body)) {
        $gcashNumber = trim((string) ($body['gcash_number'] ?? ''));

        // Same 10-15 digit rule as seller/profile.php and registration, enforced
        // through gcash_digits() so an implausible number is stored as empty
        // rather than ever being offered to a seller as a payment destination.
        $digits = gcash_digits($gcashNumber);
        if ($gcashNumber !== '' && $digits === '') {
            respond([
                "error" => "GCash number must be 10 to 15 digits",
                "field" => "gcash_number",
            ], 400);
        }

        $value = $digits; // '' clears the setting
        $stmt = $conn->prepare("INSERT INTO platform_settings (`key`, `value`) VALUES ('gcash_number', ?)
            ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
        $stmt->bind_param("s", $value);
        $stmt->execute();
        $changes['gcash_number']['to'] = $value;
        $touched = true;
    }

    if (array_key_exists('subscription_price', $body)) {
        $raw = trim((string) ($body['subscription_price'] ?? ''));

        // 1-6 digits with an optional 2-decimal part: covers ₱1.00 - ₱100,000.00
        // and rejects junk like "abc" or "299.999".
        if (!preg_match('/^\d{1,6}(\.\d{1,2})?$/', $raw)) {
            respond([
                "error" => "Subscription price must be a number like 299 or 149.50",
                "field" => "subscription_price",
            ], 400);
        }
        $num = (float) $raw;
        if ($num < 1 || $num > 100000) {
            respond([
                "error" => "Subscription price must be between ₱1.00 and ₱100,000.00",
                "field" => "subscription_price",
            ], 400);
        }

        $value = number_format($num, 2, '.', '');
        $stmt = $conn->prepare("INSERT INTO platform_settings (`key`, `value`) VALUES ('subscription_price', ?)
            ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
        $stmt->bind_param("s", $value);
        $stmt->execute();
        $changes['subscription_price']['to'] = $value;
        $touched = true;
    }

    if (!$touched) {
        respond(["error" => "No settings provided"], 400);
    }

    logAdminAudit($conn, $auth['user_id'], 'settings.update', 'platform_settings', 0, $changes);

    // Return the full merged settings so clients can replace their cache.
    $stmt = $conn->prepare("SELECT `key`, `value` FROM platform_settings");
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['key']] = $row['value'];
    }

    respond([
        "success" => true,
        "settings" => [
            "gcash_number" => $settings['gcash_number'] ?? '',
            "subscription_price" => $settings['subscription_price'] ?? '299.00',
        ],
    ]);
}

respond(["error" => "Method not allowed"], 405);
