<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$category = $_GET['category'] ?? '';
$search   = $_GET['search'] ?? '';

$sql = "SELECT p.*, c.name as category_name, c.slug as category_slug,
        u.full_name as artisan_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN users u ON p.seller_id = u.id
        WHERE p.is_active = 1";
$params = [];
$types = "";

if ($category) {
    $sql .= " AND c.slug = ?";
    $params[] = $category;
    $types .= "s";
}

if ($search) {
    $sql .= " AND (p.name LIKE ? OR p.description LIKE ? OR u.full_name LIKE ?)";
    $like = "%$search%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $types .= "sss";
}

$sql .= " ORDER BY p.created_at DESC";

$stmt = $conn->prepare($sql);
if ($types) $stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$products = [];
while ($row = $result->fetch_assoc()) {
    $products[] = $row;
}

respond(["products" => $products]);
