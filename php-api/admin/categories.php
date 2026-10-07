<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Forbidden"], 403);

$method = $_SERVER['REQUEST_METHOD'];

// GET - List categories with product count
if ($method === 'GET') {
    $result = $conn->query("SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id GROUP BY c.id ORDER BY c.name");
    $categories = $result->fetch_all(MYSQLI_ASSOC);
    respond(["categories" => $categories]);
}

// POST - Create category
if ($method === 'POST') {
    $body = getBody();
    $name = $body['name'] ?? '';
    $slug = $body['slug'] ?? '';
    $description = $body['description'] ?? '';

    if (!$name || !$slug) respond(["error" => "Name and slug required"], 400);

    $stmt = $conn->prepare("INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $name, $slug, $description);

    if (!$stmt->execute()) respond(["error" => "Category already exists or DB error"], 400);

    respond(["success" => true, "category_id" => $conn->insert_id, "message" => "Category created"]);
}

// PUT - Update category
if ($method === 'PUT') {
    $body = getBody();
    $id = $body['id'] ?? null;
    if (!$id) respond(["error" => "Category id required"], 400);

    $name = $body['name'] ?? '';
    $slug = $body['slug'] ?? '';
    $description = $body['description'] ?? '';

    $stmt = $conn->prepare("UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?");
    $stmt->bind_param("sssi", $name, $slug, $description, $id);
    $stmt->execute();

    respond(["success" => true, "message" => "Category updated"]);
}

// DELETE - Delete category
if ($method === 'DELETE') {
    $body = getBody();
    $id = $body['id'] ?? null;
    if (!$id) respond(["error" => "Category id required"], 400);

    // Check if category has products
    $stmt = $conn->prepare("SELECT COUNT(*) as cnt FROM products WHERE category_id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $count = $stmt->get_result()->fetch_assoc()['cnt'];

    if ($count > 0) respond(["error" => "Cannot delete category with $count product(s). Reassign products first."], 400);

    $stmt = $conn->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();

    respond(["success" => true, "message" => "Category deleted"]);
}

respond(["error" => "Method not allowed"], 405);
