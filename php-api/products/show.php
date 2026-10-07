<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$id = intval($_GET['id'] ?? 0);
if (!$id) respond(["error" => "Product ID required"], 400);

// Get product
$stmt = $conn->prepare("SELECT p.*, c.name as category_name, c.slug as category_slug,
    u.full_name as artisan_name, ap.specialty, ap.story as artisan_story, ap.location as artisan_location
    FROM products p
    JOIN categories c ON p.category_id = c.id
    JOIN users u ON p.seller_id = u.id
    LEFT JOIN artisan_profiles ap ON u.id = ap.user_id
    WHERE p.id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$product = $stmt->get_result()->fetch_assoc();

if (!$product) respond(["error" => "Product not found"], 404);

// Get images
$stmt = $conn->prepare("SELECT * FROM product_images WHERE product_id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$images = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Get reviews
$stmt = $conn->prepare("SELECT r.*, u.full_name as reviewer_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 10");
$stmt->bind_param("i", $id);
$stmt->execute();
$reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$product['images'] = $images;
$product['reviews_list'] = $reviews;

respond(["product" => $product]);
