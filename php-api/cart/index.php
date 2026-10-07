<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
$userId = $auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET - List cart items. The rich product SELECT (same joins as
// products/index.php) lets the frontend hydrate its cart state directly
// through apiProductToProduct() instead of keeping a second, diverging
// shape for the same product.
if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT p.*, c.quantity AS quantity, cat.name AS category_name,
        cat.slug AS category_slug, u.full_name AS artisan_name
        FROM cart c
        JOIN products p ON c.product_id = p.id
        JOIN categories cat ON p.category_id = cat.id
        JOIN users u ON p.seller_id = u.id
        WHERE c.user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $total = 0;
    foreach ($items as &$item) {
        $item['subtotal'] = $item['price'] * $item['quantity'];
        $total += $item['subtotal'];
    }

    respond(["cart" => $items, "total" => $total]);
}

// POST - Add item to cart
if ($method === 'POST') {
    $data = getBody();
    $productId = intval($data['product_id'] ?? 0);
    $quantity  = intval($data['quantity'] ?? 1);

    if (!$productId) respond(["error" => "Product ID required"], 400);

    // Check stock
    $stmt = $conn->prepare("SELECT stock_quantity FROM products WHERE id = ? AND is_active = 1");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $product = $stmt->get_result()->fetch_assoc();
    if (!$product) respond(["error" => "Product not found"], 404);
    if ($product['stock_quantity'] < $quantity) respond(["error" => "Insufficient stock"], 400);

    // Upsert
    $stmt = $conn->prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)");
    $stmt->bind_param("iii", $userId, $productId, $quantity);
    $stmt->execute();

    respond(["success" => true, "message" => "Added to cart"]);
}

// PUT - Update quantity
if ($method === 'PUT') {
    $data = getBody();
    $productId = intval($data['product_id'] ?? 0);
    $quantity  = intval($data['quantity'] ?? 1);

    if (!$productId || $quantity < 1) respond(["error" => "Valid product ID and quantity required"], 400);

    // Same stock ceiling as the add path, so a forced quantity can never
    // exceed what checkout would accept.
    $stmt = $conn->prepare("SELECT stock_quantity FROM products WHERE id = ?");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $product = $stmt->get_result()->fetch_assoc();
    if (!$product) respond(["error" => "Product not found"], 404);
    if ((int) $product['stock_quantity'] < $quantity) respond(["error" => "Insufficient stock"], 400);

    $stmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?");
    $stmt->bind_param("iii", $quantity, $userId, $productId);
    $stmt->execute();

    respond(["success" => true]);
}

// DELETE - Remove from cart
if ($method === 'DELETE') {
    $productId = intval($_GET['product_id'] ?? 0);

    if ($productId) {
        $stmt = $conn->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
        $stmt->bind_param("ii", $userId, $productId);
    } else {
        $stmt = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
        $stmt->bind_param("i", $userId);
    }
    $stmt->execute();

    respond(["success" => true]);
}

respond(["error" => "Method not allowed"], 405);
