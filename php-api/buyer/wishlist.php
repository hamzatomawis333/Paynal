<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
$userId = $auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// GET - Fetch wishlist
if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT w.id, w.product_id, w.created_at, p.name, p.price, p.image_url, p.stock_quantity, c.name as category_name, c.slug as category_slug
        FROM wishlist w
        JOIN products p ON w.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    respond(["wishlist" => $items]);
}

// POST - Add to wishlist
if ($method === 'POST') {
    $data = getBody();
    $productId = intval($data['product_id'] ?? 0);
    if (!$productId) respond(["error" => "Product ID required"], 400);

    // Check if already in wishlist
    $stmt = $conn->prepare("SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?");
    $stmt->bind_param("ii", $userId, $productId);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) respond(["error" => "Already in wishlist"], 400);

    $stmt = $conn->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)");
    $stmt->bind_param("ii", $userId, $productId);
    $stmt->execute();
    respond(["success" => true, "message" => "Added to wishlist"], 201);
}

// DELETE - Remove from wishlist
if ($method === 'DELETE') {
    $data = getBody();
    $productId = intval($data['product_id'] ?? 0);
    if (!$productId) respond(["error" => "Product ID required"], 400);

    $stmt = $conn->prepare("DELETE FROM wishlist WHERE user_id = ? AND product_id = ?");
    $stmt->bind_param("ii", $userId, $productId);
    $stmt->execute();
    respond(["success" => true, "message" => "Removed from wishlist"]);
}

respond(["error" => "Method not allowed"], 405);
