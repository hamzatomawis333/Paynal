<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$result = $conn->query("SELECT * FROM categories ORDER BY name");
$categories = $result->fetch_all(MYSQLI_ASSOC);

respond(["categories" => $categories]);
