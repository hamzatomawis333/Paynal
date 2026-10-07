<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET - Get reviews for a product (no auth needed)
if ($method === 'GET') {
    $productId = intval($_GET['product_id'] ?? 0);
    if (!$productId) respond(["error" => "Product ID required"], 400);

    $stmt = $conn->prepare("SELECT r.*, u.full_name as reviewer_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC");
    $stmt->bind_param("i", $productId);
    $stmt->execute();
    $reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    respond(["reviews" => $reviews]);
}

// POST - Add a review (auth required)
if ($method === 'POST') {
    $auth = verifyToken();
    $data = getBody();

    $productId = intval($data['product_id'] ?? 0);
    $rating    = intval($data['rating'] ?? 0);
    $comment   = trim($data['comment'] ?? '');

    if (!$productId || $rating < 1 || $rating > 5) {
        respond(["error" => "Valid product ID and rating (1-5) required"], 400);
    }

    $stmt = $conn->prepare("INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)");
    $stmt->bind_param("iiis", $productId, $auth['user_id'], $rating, $comment);
    $stmt->execute();

    // Update product rating
    $stmt = $conn->prepare("UPDATE products SET rating = (SELECT AVG(rating) FROM reviews WHERE product_id = ?), total_reviews = (SELECT COUNT(*) FROM reviews WHERE product_id = ?) WHERE id = ?");
    $stmt->bind_param("iii", $productId, $productId, $productId);
    $stmt->execute();

    respond(["success" => true]);
}

respond(["error" => "Method not allowed"], 405);
