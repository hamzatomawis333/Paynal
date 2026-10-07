<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Unauthorized"], 403);

$method = $_SERVER['REQUEST_METHOD'];

// GET - List all payment methods
if ($method === 'GET') {
    $result = $conn->query("SELECT pm.*, 
        (SELECT COUNT(*) FROM payments p WHERE p.payment_method = pm.code) as usage_count
        FROM payment_methods pm ORDER BY pm.sort_order ASC, pm.id ASC");
    $methods = $result->fetch_all(MYSQLI_ASSOC);
    respond(["payment_methods" => $methods]);
}

// POST - Create payment method
if ($method === 'POST') {
    $data = getBody();
    $name = trim($data['name'] ?? '');
    $code = trim($data['code'] ?? '');
    $description = trim($data['description'] ?? '');
    $icon = trim($data['icon'] ?? '');
    $is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;
    $sort_order = isset($data['sort_order']) ? (int)$data['sort_order'] : 0;

    if (!$name || !$code) respond(["error" => "Name and code are required"], 400);

    $stmt = $conn->prepare("INSERT INTO payment_methods (name, code, description, icon, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssii", $name, $code, $description, $icon, $is_active, $sort_order);
    
    if ($stmt->execute()) {
        respond(["success" => true, "id" => $conn->insert_id], 201);
    } else {
        respond(["error" => "Failed to create payment method"], 500);
    }
}

// PUT - Update payment method
if ($method === 'PUT') {
    $data = getBody();
    $id = (int)($data['id'] ?? 0);
    if (!$id) respond(["error" => "ID required"], 400);

    $fields = [];
    $types = "";
    $values = [];

    if (isset($data['name'])) { $fields[] = "name = ?"; $types .= "s"; $values[] = $data['name']; }
    if (isset($data['code'])) { $fields[] = "code = ?"; $types .= "s"; $values[] = $data['code']; }
    if (isset($data['description'])) { $fields[] = "description = ?"; $types .= "s"; $values[] = $data['description']; }
    if (isset($data['icon'])) { $fields[] = "icon = ?"; $types .= "s"; $values[] = $data['icon']; }
    if (isset($data['is_active'])) { $fields[] = "is_active = ?"; $types .= "i"; $values[] = (int)$data['is_active']; }
    if (isset($data['sort_order'])) { $fields[] = "sort_order = ?"; $types .= "i"; $values[] = (int)$data['sort_order']; }

    if (empty($fields)) respond(["error" => "No fields to update"], 400);

    $types .= "i";
    $values[] = $id;

    $stmt = $conn->prepare("UPDATE payment_methods SET " . implode(", ", $fields) . " WHERE id = ?");
    $stmt->bind_param($types, ...$values);
    $stmt->execute();

    respond(["success" => true]);
}

// DELETE
if ($method === 'DELETE') {
    $data = getBody();
    $id = (int)($data['id'] ?? 0);
    if (!$id) respond(["error" => "ID required"], 400);

    $stmt = $conn->prepare("DELETE FROM payment_methods WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();

    respond(["success" => true]);
}

respond(["error" => "Method not allowed"], 405);
