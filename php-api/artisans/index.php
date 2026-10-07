<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') respond(["error" => "Method not allowed"], 405);

$result = $conn->query("SELECT u.id, u.full_name, u.avatar_url, ap.specialty, ap.story, ap.location, ap.years_of_experience, ap.is_featured
    FROM artisan_profiles ap
    JOIN users u ON ap.user_id = u.id
    WHERE u.is_active = 1
    ORDER BY ap.is_featured DESC, ap.years_of_experience DESC");

$artisans = $result->fetch_all(MYSQLI_ASSOC);

respond(["artisans" => $artisans]);
