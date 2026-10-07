<?php
/**
 * Repeatable end-to-end smoke test for the Paynal API.
 *
 * Run it after any backend change (or before deploying):
 *
 *     C:\xampp\php\php.exe tests\smoke.php
 *
 * Requirements: Apache + MySQL running (XAMPP), the project DB migrated.
 * It mints JWTs directly (same secret as the app) and exercises the real
 * HTTP endpoints, then cleans up every row it created. Exit code 0 = all
 * passed; 1 = at least one failure.
 *
 * Optional environment overrides:
 *     SMOKE_BASE       API base            (default http://localhost/Paynal-main/php-api)
 *     SMOKE_ADMIN_ID   admin user id       (default 6)
 *     SMOKE_SELLER_ID  seller user id      (default 3)
 *     SMOKE_BUYER_ID   buyer user id       (default 7)
 */

$_SERVER['REQUEST_METHOD'] = 'GET';
require __DIR__ . '/../php-api/config.php';

$BASE  = getenv('SMOKE_BASE') ?: 'http://localhost/Paynal-main/php-api';
$adminId  = (int) (getenv('SMOKE_ADMIN_ID') ?: 6);
$sellerId = (int) (getenv('SMOKE_SELLER_ID') ?: 3);
$buyerId  = (int) (getenv('SMOKE_BUYER_ID') ?: 7);

$PASS = 0;
$FAIL = 0;
$SKIP = 0;

function check($label, $cond, $detail = '') {
    global $PASS, $FAIL;
    if ($cond) {
        $PASS++;
        echo "  PASS  $label\n";
    } else {
        $FAIL++;
        echo "* FAIL  $label" . ($detail !== '' ? " - $detail" : '') . "\n";
    }
}

function skip($label, $why) {
    global $SKIP;
    $SKIP++;
    echo "  SKIP  $label - $why\n";
}

/** HTTP request against the API. Returns [status, decoded body]. */
function req($method, $path, $token = null, $body = null) {
    global $BASE;
    $headers = "Content-Type: application/json\r\n";
    if ($token) $headers .= "Authorization: Bearer $token\r\n";

    $opts = ['http' => [
        'method'         => $method,
        'header'         => $headers,
        'ignore_errors'  => true,   // keep the body on 4xx/5xx
        'timeout'        => 15,
    ]];
    if ($body !== null) {
        $opts['http']['content'] = json_encode($body);
    }

    $raw = @file_get_contents($BASE . $path, false, stream_context_create($opts));
    $status = 0;
    if (isset($http_response_header[0]) &&
        preg_match('#HTTP/\S+\s+(\d{3})#', $http_response_header[0], $m)) {
        $status = (int) $m[1];
    }
    $decoded = json_decode($raw !== false && $raw !== '' ? $raw : 'null', true);
    return [$status, is_array($decoded) ? $decoded : null];
}

$adminToken  = createToken($adminId, 'admin');
$sellerToken = createToken($sellerId, 'seller');
$buyerToken  = createToken($buyerId, 'buyer');

$cleanup = [];   // closures run in finally-style at the end
$runCleanup = function () use (&$cleanup) {
    foreach (array_reverse($cleanup) as $fn) {
        try { $fn(); } catch (Throwable $e) { echo "  cleanup error: {$e->getMessage()}\n"; }
    }
};

echo "Base: $BASE\n\n";

try {
    // ---------------------------------------------------------- public reads
    echo "[public]\n";
    [$s, $r] = req('GET', '/products/index.php');
    check('products list 200', $s === 200 && isset($r['products']), "got $s");
    $products = $r['products'] ?? [];
    $stocky = null;
    foreach ($products as $p) {
        if ((int) ($p['stock_quantity'] ?? 0) > 0 && (int) ($p['is_active'] ?? 0) === 1) {
            $stocky = $p; break;
        }
    }
    check('an in-stock product exists', $stocky !== null);

    [$s, $r] = req('GET', '/products/categories.php');
    check('categories list 200', $s === 200 && isset($r['categories']), "got $s");

    // ---------------------------------------------------------- auth + throttle
    echo "[auth]\n";
    $smokeEmail = 'smoke_' . time() . '_' . rand(100, 999) . '@paynal.local';
    $smokePass  = 'Smoke1234!';

    [$s, $r] = req('POST', '/auth/register.php', null, [
        'full_name' => 'Smoke Test', 'email' => $smokeEmail,
        'password' => $smokePass, 'role' => 'buyer',
    ]);
    check('register temp buyer 201', $s === 201, "got $s");
    if ($s === 201) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $smokeEmail);
        $stmt->execute();
        $tempUserId = (int) ($stmt->get_result()->fetch_assoc()['id'] ?? 0);
        $cleanup[] = function () use ($conn, $smokeEmail, $tempUserId) {
            $conn->query("DELETE FROM login_attempts WHERE email = " . "'" . $conn->real_escape_string($smokeEmail) . "'");
            if ($tempUserId) $conn->query("DELETE FROM users WHERE id = " . (int) $tempUserId);
        };
    } else {
        $tempUserId = 0;
    }

    [$s, $r] = req('POST', '/auth/login.php', null, [
        'email' => $smokeEmail, 'password' => $smokePass,
    ]);
    check('login with correct password 200', $s === 200 && !empty($r['token']), "got $s");

    // Exactly 5 failures are allowed per email per 15 minutes; the 6th is
    // locked. Everything below runs against the temp account only.
    $codes = [];
    for ($i = 0; $i < 6; $i++) {
        [$code] = req('POST', '/auth/login.php', null, [
            'email' => $smokeEmail, 'password' => 'WrongPassword1!',
        ]);
        $codes[] = $code;
    }
    check(
        'first 5 wrong attempts return 401',
        array_slice($codes, 0, 5) === [401, 401, 401, 401, 401],
        'got ' . implode(',', $codes)
    );
    check('6th attempt throttled 429', ($codes[5] ?? 0) === 429, 'got ' . implode(',', $codes));

    [$s] = req('POST', '/auth/login.php', null, [
        'email' => $smokeEmail, 'password' => $smokePass,
    ]);
    check('correct password also 429 while locked', $s === 429, "got $s");

    $conn->query("DELETE FROM login_attempts WHERE email = '" . $conn->real_escape_string($smokeEmail) . "'");
    [$s] = req('POST', '/auth/login.php', null, [
        'email' => $smokeEmail, 'password' => $smokePass,
    ]);
    check('login works again after attempts cleared', $s === 200, "got $s");

    // ---------------------------------------------------------- admin reads
    echo "[admin]\n";
    [$s, $r] = req('GET', '/admin/users.php?limit=2', $adminToken);
    check('users limit=2 200', $s === 200 && isset($r['users'], $r['total']), "got $s");
    check('users limit respected', isset($r['users']) && count($r['users']) <= 2);

    [$s, $r] = req('GET', '/admin/users.php?limit=999', $adminToken);
    check('users limit=999 rejected 400', $s === 400, "got $s");

    [$s, $r] = req('GET', '/admin/subscriptions.php?limit=3', $adminToken);
    check('subscriptions limit=3 200 + total', $s === 200 && isset($r['subscriptions'], $r['total']), "got $s");

    // Auto-expire: no row may look Active with an end date in the past.
    $stale = 0;
    foreach (($r['subscriptions'] ?? []) as $sub) {
        if (($sub['status'] ?? '') === 'Active' && ($sub['end_date'] ?? '') !== ''
            && strtotime($sub['end_date']) < time()) {
            $stale++;
        }
    }
    check('no stale Active subscriptions in admin list', $stale === 0, "$stale stale");

    [$s, $r] = req('GET', '/admin/orders.php?limit=2', $adminToken);
    check('orders list limit=2 200 + totals', $s === 200
        && isset($r['orders'], $r['buyers'], $r['orders_total'], $r['buyers_total']), "got $s");
    check('buyers limit respected', isset($r['buyers']) && count($r['buyers']) <= 2);

    [$s, $r] = req('GET', '/admin/orders.php?limit=999', $adminToken);
    check('orders limit=999 rejected 400', $s === 400, "got $s");

    [$s, $r] = req('GET', '/admin/orders.php?id=999999', $adminToken);
    check('missing order detail 404', $s === 404, "got $s");

    [$s, $r] = req('GET', '/admin/audit.php?limit=5', $adminToken);
    check('audit log readable', $s === 200 && isset($r['entries']), "got $s");

    [$s] = req('GET', '/admin/users.php', $sellerToken);
    check('seller blocked from admin users 403', $s === 403, "got $s");

    [$s] = req('GET', '/admin/users.php');
    check('missing token rejected 401/403', in_array($s, [401, 403], true), "got $s");

    // ---------------------------------------------------------- settings validation (no mutation)
    echo "[settings]\n";
    [$s, $r] = req('GET', '/admin/settings.php', $adminToken);
    check('settings GET has gcash + price', $s === 200
        && isset($r['settings']['gcash_number'], $r['settings']['subscription_price']), "got $s");

    [$s] = req('PUT', '/admin/settings.php', $adminToken, ['subscription_price' => 'abc']);
    check('invalid price rejected 400', $s === 400, "got $s");

    [$s] = req('PUT', '/admin/settings.php', $adminToken, ['subscription_price' => '999999999']);
    check('out-of-range price rejected 400', $s === 400, "got $s");

    // ---------------------------------------------------------- cart cycle
    echo "[cart]\n";
    [$s, $r] = req('GET', '/cart/index.php', $buyerToken);
    check('cart GET 200', $s === 200 && isset($r['cart']), "got $s");
    $preCart = $r['cart'] ?? [];
    $testProduct = null;
    foreach ($products as $p) {
        $inCart = false;
        foreach ($preCart as $c) {
            if ((string) ($c['id'] ?? '') === (string) $p['id']) { $inCart = true; break; }
        }
        if (!$inCart && (int) ($p['stock_quantity'] ?? 0) > 0) { $testProduct = $p; break; }
    }

    if ($testProduct === null) {
        skip('cart add/update/remove', 'no suitable out-of-cart product');
    } else {
        $tpId = (int) $testProduct['id'];
        $cleanup[] = function () use ($conn, $buyerId, $tpId) {
            $conn->query("DELETE FROM cart WHERE user_id = " . (int) $buyerId . " AND product_id = " . $tpId);
        };

        [$s] = req('POST', '/cart/index.php', $buyerToken, ['product_id' => $tpId, 'quantity' => 1]);
        check('cart add 200', $s === 200, "got $s");

        [$s, $r] = req('GET', '/cart/index.php', $buyerToken);
        $row = null;
        foreach (($r['cart'] ?? []) as $c) if ((int) $c['id'] === $tpId) $row = $c;
        check('added row present with product fields', $row !== null
            && isset($row['quantity'], $row['category_slug'], $row['artisan_name']),
            json_encode($row));

        [$s] = req('PUT', '/cart/index.php', $buyerToken, ['product_id' => $tpId, 'quantity' => 2]);
        check('cart quantity update 200', $s === 200, "got $s");

        [$s] = req('PUT', '/cart/index.php', $buyerToken, ['product_id' => $tpId, 'quantity' => 999999]);
        check('over-stock quantity rejected 400', $s === 400, "got $s");

        [$s] = req('DELETE', "/cart/index.php?product_id=$tpId", $buyerToken);
        check('cart remove 200', $s === 200, "got $s");

        [$s, $r] = req('GET', '/cart/index.php', $buyerToken);
        $gone = true;
        foreach (($r['cart'] ?? []) as $c) if ((int) $c['id'] === $tpId) $gone = false;
        check('row removed from cart', $gone);
    }

    // ---------------------------------------------------------- delete guards
    echo "[delete guards]\n";
    [$s] = req('DELETE', '/admin/users.php', $adminToken, ['user_id' => $adminId]);
    check('admin cannot delete self 400', $s === 400, "got $s");

    [$s] = req('DELETE', '/admin/users.php', $adminToken, ['user_id' => 999999]);
    check('deleting missing user 404', $s === 404, "got $s");

    $stmt = $conn->prepare(
        "SELECT (SELECT COUNT(*) FROM orders WHERE user_id = ?) +
                (SELECT COUNT(*) FROM order_items WHERE seller_id = ?) AS linked"
    );
    $stmt->bind_param("ii", $buyerId, $buyerId);
    $stmt->execute();
    $linked = (int) ($stmt->get_result()->fetch_assoc()['linked'] ?? 0);
    if ($linked > 0) {
        [$s, $r] = req('DELETE', '/admin/users.php', $adminToken, ['user_id' => $buyerId]);
        check('account with order history blocked 409', $s === 409, "got $s: " . json_encode($r));
    } else {
        skip('order-history delete guard', 'no accounts with orders');
    }

    if ($tempUserId) {
        [$s] = req('DELETE', '/admin/users.php', $adminToken, ['user_id' => $tempUserId]);
        check('temp user delete 200', $s === 200, "got $s");
    }

    // ---------------------------------------------------------- notifications
    echo "[notifications]\n";
    [$s, $r] = req('GET', '/notifications.php', $buyerToken);
    check('notifications GET 200', $s === 200, "got $s");

    // ---------------------------------------------------------- subscription auto-expire (live)
    echo "[subscriptions]\n";
    $row = $conn->query(
        "SELECT id, end_date FROM seller_subscriptions WHERE status = 'Expired' LIMIT 1"
    )->fetch_assoc();
    if (!$row) {
        skip('admin auto-expire flip', 'no Expired row to reuse');
    } else {
        $subId = (int) $row['id'];
        $origEnd = $row['end_date'];
        $conn->query("UPDATE seller_subscriptions SET status = 'Active', end_date = '2000-01-01' WHERE id = $subId");
        [$s, $r] = req('GET', '/admin/subscriptions.php', $adminToken);
        $statusNow = null;
        foreach (($r['subscriptions'] ?? []) as $sub) {
            if ((int) $sub['id'] === $subId) $statusNow = $sub['status'];
        }
        check('stale Active row auto-expires on admin GET', $statusNow === 'Expired', "status=" . var_export($statusNow, true));
        $conn->query("UPDATE seller_subscriptions SET end_date = '" . $conn->real_escape_string($origEnd) . "' WHERE id = $subId");
        $cleanup[] = function () use ($conn, $subId, $origEnd) {
            $conn->query("UPDATE seller_subscriptions SET status = 'Expired', end_date = '" . $conn->real_escape_string($origEnd) . "' WHERE id = $subId");
        };
    }
} catch (Throwable $e) {
    $FAIL++;
    echo "* FAIL  unexpected exception: {$e->getMessage()}\n";
} finally {
    $runCleanup();
}

echo "\n" . str_repeat('-', 50) . "\n";
echo "PASS: $PASS   FAIL: $FAIL   SKIP: $SKIP\n";
exit($FAIL > 0 ? 1 : 0);
