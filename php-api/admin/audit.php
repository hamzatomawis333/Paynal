<?php
// Admin audit trail reader: GET /admin/audit.php?limit=100&action=user.delete
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'admin') respond(["error" => "Admin access required"], 403);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$limit = intval($_GET['limit'] ?? 100);
if ($limit < 1) $limit = 100;
if ($limit > 500) $limit = 500;

$action = trim($_GET['action'] ?? '');

$sql = "SELECT l.*, u.full_name AS admin_name, u.email AS admin_email
        FROM admin_audit_log l
        LEFT JOIN users u ON l.admin_id = u.id";
$params = [];
$types = '';

if ($action !== '') {
    $sql .= " WHERE l.action = ?";
    $params[] = $action;
    $types .= 's';
}

$sql .= " ORDER BY l.id DESC LIMIT ?";
$limitParam = $limit;
$params[] = $limitParam;
$types .= 'i';

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

foreach ($rows as &$row) {
    if (isset($row['details']) && $row['details'] !== null && $row['details'] !== '') {
        $decoded = json_decode($row['details'], true);
        $row['details'] = $decoded ?? $row['details'];
    }
}
unset($row);

respond(["entries" => $rows, "count" => count($rows)]);
