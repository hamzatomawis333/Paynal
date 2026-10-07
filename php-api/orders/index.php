<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../payments/gcash-workflow.php';
require_once __DIR__ . '/../notifications-lib.php';

$auth = verifyToken();
$userId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET - List user orders
if ($method === 'GET') {
    // needs_payment is computed from the payment rows rather than read off
    // orders.payment_status. The order-level aggregate flips to
    // 'awaiting_confirmation' as soon as ANY one seller has been paid, which
    // would drop a multi-seller order out of the buyer's attention list while
    // the other sellers are still unpaid. The buyer has to see an order until
    // every payment group has been claimed.
    $stmt = $conn->prepare(
        "SELECT o.*,
                EXISTS (SELECT 1 FROM payments p
                        WHERE p.order_id = o.id AND p.status = 'pending') AS needs_payment
         FROM orders o
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC"
    );
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $orders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    foreach ($orders as &$order) {
        $stmt = $conn->prepare("SELECT oi.*, p.name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?");
        $stmt->bind_param("i", $order['id']);
        $stmt->execute();
        $order['items'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
    unset($order);

    respond(["orders" => $orders]);
}

// POST - Create new order from cart
if ($method === 'POST') {
    $data = getBody();

    // Checkout accepts GCash (paid up front per seller) and Cash on Delivery
    // (no payment rows; the courier collects). Anything else is rejected
    // outright rather than silently coerced, so a tampered payload cannot
    // create another mode.
    $ALLOWED_PAYMENT_METHODS = ['gcash', 'cod'];
    $paymentMethod = trim((string) ($data['payment_method'] ?? ''));
    if (!in_array($paymentMethod, $ALLOWED_PAYMENT_METHODS, true)) {
        respond(["error" => "Only GCash and Cash on Delivery are accepted for this order"], 400);
    }

    $notes = data_string($data, 'notes', 500);
    $postedItems = $data['items'] ?? [];

    // Structured Philippine address. Each part is validated independently so a
    // missing or malformed level is reported precisely, then composed into the
    // single shipping_address line the schema already stores. `street` is
    // optional: checkout collects only the PSA region/province/city/barangay
    // cascade, but a still-valid street is stored when a caller supplies one.
    $address = $data['address'] ?? [];
    if (!is_array($address)) respond(["error" => "Invalid address payload"], 400);

    $street    = data_string($address, 'street', 200);
    $region    = data_string($address, 'region', 120);
    $province  = data_string($address, 'province', 120);
    $city      = data_string($address, 'city', 120);
    $barangay  = data_string($address, 'barangay', 120);

    $missing = [];
    if ($region === '')   $missing[] = 'region';
    if ($province === '') $missing[] = 'province';
    if ($city === '')     $missing[] = 'city';
    if ($barangay === '') $missing[] = 'barangay';
    if ($missing) {
        respond([
            "error" => "Incomplete shipping address",
            "missing" => $missing,
        ], 400);
    }

    $shippingAddress = implode(', ', array_filter(
        [$street, $barangay, $city, $province, $region],
        static fn($part) => $part !== ''
    ));

    // Use posted items from frontend cart
    if (!empty($postedItems)) {
        $cartItems = [];
        foreach ($postedItems as $pi) {
            $pid = intval($pi['product_id'] ?? 0);
            $qty = intval($pi['quantity'] ?? 1);
            if (!$pid || $qty < 1) continue;

            $stmt = $conn->prepare("SELECT id, price, stock_quantity, seller_id FROM products WHERE id = ? AND is_active = 1");
            $stmt->bind_param("i", $pid);
            $stmt->execute();
            $product = $stmt->get_result()->fetch_assoc();
            if (!$product) respond(["error" => "Product ID $pid not found"], 404);
            if ($product['stock_quantity'] < $qty) respond(["error" => "Insufficient stock for product ID $pid"], 400);

            $cartItems[] = [
                'product_id' => $pid,
                'quantity' => $qty,
                'price' => $product['price'],
                'stock_quantity' => $product['stock_quantity'],
                'seller_id' => $product['seller_id'],
            ];
        }
    } else {
        // Fallback: read from DB cart table
        $stmt = $conn->prepare("SELECT c.*, p.price, p.stock_quantity, p.seller_id FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $cartItems = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    if (empty($cartItems)) respond(["error" => "Cart is empty"], 400);

    // A double-clicked "Place Order" (or an automatic retry) must not create a
    // second order or decrement stock twice. The client sends a key per
    // checkout attempt; the unique index makes the server the authority.
    $idempotencyKey = data_string($data, 'idempotency_key', 64);
    if ($idempotencyKey !== '') {
        $dupe = $conn->prepare("SELECT id, order_number, total_amount, shipping_fee FROM orders WHERE user_id = ? AND idempotency_key = ?");
        $dupe->bind_param("is", $userId, $idempotencyKey);
        $dupe->execute();
        $existing = $dupe->get_result()->fetch_assoc();
if ($existing) {
            $existingId = (int)$existing['id'];

            // mysqli refuses a new query while an earlier statement still holds
            // unread rows ("Commands out of sync"), so every result here is
            // read to completion and released before the next statement runs.
            $sumStmt = $conn->prepare("SELECT COALESCE(SUM(subtotal),0) s FROM order_items WHERE order_id = ?");
            $sumStmt->bind_param("i", $existingId);
            $sumStmt->execute();
            $sumRes = $sumStmt->get_result();
            $existingTotal = (float)($sumRes->fetch_assoc()['s'] ?? 0);
            $sumRes->free();
            $sumStmt->free_result();
            $sumStmt->close();
            $existingFee = (float)$existing['shipping_fee'];

            $payStmt = $conn->prepare("SELECT * FROM payments WHERE order_id = ? ORDER BY seller_id IS NULL, seller_id");
            $payStmt->bind_param("i", $existingId);
            $payStmt->execute();
            $payRows = $payStmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $payStmt->free_result();
            $payStmt->close();

            $sellerStmt = $conn->prepare("SELECT full_name, gcash_number FROM users WHERE id = ?");
            $sellerCache = [];
            $groups = [];
            foreach ($payRows as $p) {
                $sid = $p['seller_id'] === null ? null : (int)$p['seller_id'];
                if ($sid !== null && !array_key_exists($sid, $sellerCache)) {
                    $sellerStmt->bind_param("i", $sid);
                    $sellerStmt->execute();
                    $res = $sellerStmt->get_result();
                    $sellerCache[$sid] = $res->fetch_assoc() ?: ['full_name' => 'Seller', 'gcash_number' => null];
                    $res->free();
                }
                $sellerRow = $sid === null
                    ? ['full_name' => 'Seller', 'gcash_number' => null]
                    : $sellerCache[$sid];

                $groups[] = [
                    'payment_id'    => (int)$p['id'],
                    'seller_id'     => $sid,
                    'seller_name'   => $sellerRow['full_name'],
                    'gcash_number'  => gcash_digits($sellerRow['gcash_number']),
                    'amount'        => (float)$p['amount'],
                    'subtotal'      => 0.0,
                    'shipping_share' => (float)$p['amount'] - 0.0,
                    'status'        => $p['status'],
                    'conversation_id' => $p['conversation_id'] === null ? null : (int)$p['conversation_id'],
                    'rejection_reason' => $p['rejection_reason'],
                    'items'         => [],
                ];
            }
            $sellerStmt->close();

            // Report the order's real current payment state, not a hardcoded
            // 'pending': a retry long after checkout should show 'paid'.
            $stStmt = $conn->prepare("SELECT status, payment_status FROM orders WHERE id = ?");
            $stStmt->bind_param("i", $existingId);
            $stStmt->execute();
            $stRes = $stStmt->get_result();
            $existingState = $stRes->fetch_assoc() ?: ['status' => 'pending', 'payment_status' => 'pending'];
            $stRes->free();
            $stStmt->close();

            respond([
                "success" => true,
                "duplicate" => true,
                "order" => [
                    "id" => $existingId,
                    "order_number" => $existing['order_number'],
                    "total" => $existingTotal,
                    "shipping_fee" => $existingFee,
                    "grand_total" => $existingTotal + $existingFee,
                    "status" => $existingState['status'],
                    "payment_status" => $existingState['payment_status'],
                ],
                "payment_groups" => $groups,
            ]);
        }
    }

    // Group by seller. seller_id comes from the products table, never from the
    // request body, so a buyer cannot redirect a payment to another vendor.
    $sellerGroups = [];
    $totalAmount = 0.0;
    foreach ($cartItems as $item) {
        $sellerId = (int) $item['seller_id'];
        $subtotal = (float) $item['price'] * (int) $item['quantity'];
        $totalAmount += $subtotal;

        if (!isset($sellerGroups[$sellerId])) {
            $sellerGroups[$sellerId] = ['subtotal' => 0.0, 'items' => []];
        }
        $sellerGroups[$sellerId]['subtotal'] += $subtotal;
        $sellerGroups[$sellerId]['items'][] = [
            'product_id' => (int) $item['product_id'],
            // Filled in below from the products table; reading it here would
            // trip the warning-to-exception handler because cart rows carry
            // only id/price/stock/seller.
            'name'       => null,
            'quantity'   => (int) $item['quantity'],
            'unit_price' => (float) $item['price'],
            'subtotal'   => $subtotal,
        ];
    }

    // Resolve each seller's identity and registered GCash number from the
    // database. Product names were not fetched yet, so fetch them here.
    $productStmt = $conn->prepare("SELECT id, name FROM products WHERE id = ?");
    $sellerStmt = $conn->prepare("SELECT id, full_name, role, is_active, gcash_number FROM users WHERE id = ?");
    $sellerCache = [];

    foreach ($sellerGroups as $sellerId => &$group) {
        // Fill in product names (used only for the seller's own message).
        foreach ($group['items'] as &$gItem) {
            $productStmt->bind_param("i", $gItem['product_id']);
            $productStmt->execute();
            $row = $productStmt->get_result()->fetch_assoc();
            $gItem['name'] = $row['name'] ?? ('Product #' . $gItem['product_id']);
        }
        unset($gItem);

        if (!isset($sellerCache[$sellerId])) {
            $sellerStmt->bind_param("i", $sellerId);
            $sellerStmt->execute();
            $sellerCache[$sellerId] = $sellerStmt->get_result()->fetch_assoc();
        }
        $seller = $sellerCache[$sellerId];

        if (!$seller) {
            respond(["error" => "Seller for this order is no longer available"], 400);
        }
        if ($seller['role'] !== 'seller') {
            respond(["error" => "A product in this order is not owned by a seller account"], 400);
        }
        if ((int) $seller['is_active'] !== 1) {
            respond(["error" => "The seller account for one of these products is currently unavailable. Please remove it from your cart."], 400);
        }

        // A COD order needs no GCash destination - the courier collects - so
        // the seller's gcash_number is only required when the buyer will pay
        // up front.
        if ($paymentMethod === 'gcash') {
            $digits = gcash_digits($seller['gcash_number']);
            if ($digits === '') {
                respond([
                    "error" => "This seller has not configured a GCash payment number yet. Please contact the seller.",
                    "seller_id" => (int) $sellerId,
                    "seller_name" => $seller['full_name'],
                ], 400);
            }
            $group['gcash_number'] = $digits;
        }

        $group['seller_id'] = (int) $sellerId;
        $group['seller_name'] = $seller['full_name'];
    }
    unset($group);

    $shippingFee = $totalAmount >= 3000 ? 0 : 150;
    $grandTotal = $totalAmount + $shippingFee;

    // Shipping is one order-level charge, so it is split across vendors in
    // proportion to their subtotal. The last vendor absorbs the rounding
    // remainder so the shares always sum back to the exact shipping fee.
    $sellerIds = array_keys($sellerGroups);
    $lastSellerId = (int) end($sellerIds);
    $shippingAllocated = 0.0;
    foreach ($sellerGroups as $sellerId => &$group) {
        if ((int) $sellerId === $lastSellerId) {
            $share = round($shippingFee - $shippingAllocated, 2);
        } else {
            $share = round($shippingFee * ($group['subtotal'] / $totalAmount), 2);
            $shippingAllocated += $share;
        }
        $group['shipping_share'] = $share;
        $group['amount'] = round($group['subtotal'] + $share, 2);
    }
    unset($group);

    $orderNumber = 'MTO-' . date('Ymd') . '-' . str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);

    $conn->begin_transaction();
    try {
        // Create order
        $stmt = $conn->prepare("INSERT INTO orders (user_id, order_number, total_amount, shipping_fee, payment_method, payment_status, shipping_address, notes, idempotency_key) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)");
        $nullableKey = $idempotencyKey === '' ? null : $idempotencyKey;
        // 8 placeholders: user_id, order_number, total, shipping,
        // payment_method, shipping_address, notes, idempotency_key.
        // payment_status is a literal.
        $stmt->bind_param("isddssss", $userId, $orderNumber, $totalAmount, $shippingFee, $paymentMethod, $shippingAddress, $notes, $nullableKey);
        $stmt->execute();
        $orderId = (int) $conn->insert_id;

        // Create order items & update stock
        foreach ($cartItems as $item) {
            $subtotal = (float) $item['price'] * (int) $item['quantity'];
            $stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("iiiidd", $orderId, $item['product_id'], $item['seller_id'], $item['quantity'], $item['price'], $subtotal);
            $stmt->execute();

            $stmt = $conn->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
            $stmt->bind_param("ii", $item['quantity'], $item['product_id']);
            $stmt->execute();
        }

        // One conversation per seller either way. GCash orders also get a
        // payment row + payment inquiry per seller; COD orders get a
        // collect-on-delivery message instead and no payment rows at all.
        $groups = [];
        foreach ($sellerGroups as $sellerId => $group) {
            $conversationId = ensureBuyerSellerConversation($conn, (int) $userId, (int) $sellerId);

            if ($paymentMethod === 'gcash') {
                $stmt = $conn->prepare("INSERT INTO payments (order_id, seller_id, amount, payment_method, status, conversation_id) VALUES (?, ?, ?, 'gcash', 'pending', ?)");
                // 4 placeholders: order_id, seller_id, amount, conversation_id.
                // payment_method and status are literals.
                $stmt->bind_param("iidi", $orderId, $sellerId, $group['amount'], $conversationId);
                $stmt->execute();
                $paymentId = (int) $conn->insert_id;

                postSystemMessage(
                    $conn,
                    $conversationId,
                    (int) $userId,
                    buildPaymentInquiry(
                        $orderNumber,
                        $group['seller_name'],
                        $group['gcash_number'],
                        $group['items'],
                        $group['subtotal'],
                        $group['shipping_share']
                    )
                );

                // The seller used to learn about the order only by refreshing the
                // orders list or opening the chat. Inside the transaction, so it
                // rolls back with the order if anything later fails.
                notifyUser(
                    $conn,
                    (int) $sellerId,
                    'order',
                    'New order ' . $orderNumber,
                    gcash_money($group['amount']) . ' awaiting GCash payment. '
                        . 'Payment instructions were sent in your conversation with the buyer.',
                    '/seller/orders',
                    $orderId
                );

                $groups[] = [
                    'payment_id'      => $paymentId,
                    'seller_id'       => (int) $sellerId,
                    'seller_name'     => $group['seller_name'],
                    'gcash_number'    => $group['gcash_number'],
                    'amount'          => (float) $group['amount'],
                    'subtotal'        => (float) $group['subtotal'],
                    'shipping_share'  => (float) $group['shipping_share'],
                    'status'          => 'pending',
                    'conversation_id' => $conversationId,
                    'rejection_reason' => null,
                    'items'           => $group['items'],
                ];
            } else {
                $itemList = [];
                foreach ($group['items'] as $gItem) {
                    $itemList[] = (int) $gItem['quantity'] . ' x ' . $gItem['name'];
                }

                postSystemMessage(
                    $conn,
                    $conversationId,
                    (int) $userId,
                    'Order ' . $orderNumber . ' has been placed (Cash on Delivery).' . "\n"
                        . 'Amount to collect on arrival: ' . gcash_money($group['amount']) . "\n"
                        . 'Items: ' . implode(', ', $itemList)
                );

                notifyUser(
                    $conn,
                    (int) $sellerId,
                    'order',
                    'New COD order ' . $orderNumber,
                    gcash_money($group['amount']) . ' will be collected on delivery. '
                        . 'The order details were sent to your conversation with the buyer.',
                    '/seller/orders',
                    $orderId
                );
            }
        }

        // Clear cart
        $stmt = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();

        $conn->commit();

        respond([
            "success" => true,
            "order" => [
                "id" => $orderId,
                "order_number" => $orderNumber,
                "total" => $totalAmount,
                "shipping_fee" => $shippingFee,
                "grand_total" => $grandTotal,
                "payment_status" => 'pending',
                "payment_method" => $paymentMethod,
            ],
            "payment_groups" => $groups,
        ], 201);
    } catch (Exception $e) {
        $conn->rollback();
        respond(["error" => "Order creation failed"], 500);
    }
}

respond(["error" => "Method not allowed"], 405);
