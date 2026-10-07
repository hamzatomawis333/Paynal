<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);

$sellerId = (int)$auth['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// Helper: check if seller has active subscription
function hasActiveSubscription($conn, $sellerId) {
    $stmt = $conn->prepare("SELECT id, status, end_date FROM seller_subscriptions WHERE seller_id = ? AND status = 'Active' ORDER BY created_at DESC LIMIT 1");
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $sub = $stmt->get_result()->fetch_assoc();
    if (!$sub) return false;
    // Double-check expiry
    if ($sub['end_date'] && strtotime($sub['end_date']) < time()) {
        $update = $conn->prepare("UPDATE seller_subscriptions SET status = 'Expired', updated_at = NOW() WHERE id = ?");
        $update->bind_param("i", $sub['id']);
        $update->execute();
        return false;
    }
    return true;
}

// GET: List seller's products
if ($method === 'GET') {
    $stmt = $conn->prepare("SELECT p.*, c.name as category_name, c.slug as category_slug
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.seller_id = ?
        ORDER BY p.created_at DESC");
    $stmt->bind_param("i", $sellerId);
    $stmt->execute();
    $products = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    respond(["products" => $products]);
}

// POST: Add new product (requires active subscription)
if ($method === 'POST') {
    if (!hasActiveSubscription($conn, $sellerId)) {
        respond(["error" => "Active subscription required to add products. Please subscribe first."], 403);
    }

    $body = getBody();
    $name = trim($body['name'] ?? '');
    $description = trim($body['description'] ?? '');
    $cultural_background = trim($body['cultural_background'] ?? '');
    $price = floatval($body['price'] ?? 0);
    $stock = intval($body['stock_quantity'] ?? 0);
    $category_id = intval($body['category_id'] ?? 0);
    $image_url = trim($body['image_url'] ?? '');

    if (!$name || !$price || !$category_id) {
        respond(["error" => "Name, price, and category are required"], 400);
    }

    $stmt = $conn->prepare("INSERT INTO products (seller_id, category_id, name, description, cultural_background, price, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iisssdis", $sellerId, $category_id, $name, $description, $cultural_background, $price, $stock, $image_url);

    if ($stmt->execute()) {
        respond(["success" => true, "product_id" => $stmt->insert_id], 201);
    } else {
        respond(["error" => "Failed to create product"], 500);
    }
}

// PUT: Update product (requires active subscription)
if ($method === 'PUT') {
    if (!hasActiveSubscription($conn, $sellerId)) {
        respond(["error" => "Active subscription required to edit products. Please subscribe first."], 403);
    }

    $body = getBody();
    $id = intval($body['id'] ?? 0);
    if (!$id) respond(["error" => "Product ID required"], 400);

    // Verify ownership
    $check = $conn->prepare("SELECT id FROM products WHERE id = ? AND seller_id = ?");
    $check->bind_param("ii", $id, $sellerId);
    $check->execute();
    if (!$check->get_result()->fetch_assoc()) respond(["error" => "Product not found"], 404);

    $name = trim($body['name'] ?? '');
    $description = trim($body['description'] ?? '');
    $cultural_background = trim($body['cultural_background'] ?? '');
    $price = floatval($body['price'] ?? 0);
    $stock = intval($body['stock_quantity'] ?? 0);
    $category_id = intval($body['category_id'] ?? 0);
    $image_url = trim($body['image_url'] ?? '');
    $is_active = intval($body['is_active'] ?? 1);

    $stmt = $conn->prepare("UPDATE products SET category_id=?, name=?, description=?, cultural_background=?, price=?, stock_quantity=?, image_url=?, is_active=?, updated_at=NOW() WHERE id=? AND seller_id=?");
    $stmt->bind_param("isssdisiii", $category_id, $name, $description, $cultural_background, $price, $stock, $image_url, $is_active, $id, $sellerId);

    if ($stmt->execute()) {
        respond(["success" => true]);
    } else {
        respond(["error" => "Failed to update product"], 500);
    }
}

// DELETE: Delete product (no subscription required - sellers can manage existing products)
if ($method === 'DELETE') {
    $body = getBody();
    $id = intval($body['id'] ?? 0);
    if (!$id) respond(["error" => "Product ID required"], 400);

    $stmt = $conn->prepare("DELETE FROM products WHERE id = ? AND seller_id = ?");
    $stmt->bind_param("ii", $id, $sellerId);

    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(["success" => true]);
    } else {
        respond(["error" => "Product not found or not owned"], 404);
    }
}

respond(["error" => "Method not allowed"], 405);
