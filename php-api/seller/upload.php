<?php
require_once __DIR__ . '/../config.php';

$auth = verifyToken();
if ($auth['role'] !== 'seller') respond(["error" => "Seller access required"], 403);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(["error" => "Method not allowed"], 405);

if (!isset($_FILES['image'])) respond(["error" => "No image uploaded"], 400);

$file = $_FILES['image'];
$uploadErrors = [
    UPLOAD_ERR_INI_SIZE => 'Image is bigger than the server upload limit.',
    UPLOAD_ERR_FORM_SIZE => 'Image is bigger than the form upload limit.',
    UPLOAD_ERR_PARTIAL => 'Image upload was interrupted. Please try again.',
    UPLOAD_ERR_NO_FILE => 'No image uploaded.',
    UPLOAD_ERR_NO_TMP_DIR => 'Server temporary upload folder is missing.',
    UPLOAD_ERR_CANT_WRITE => 'Server cannot write the uploaded file.',
    UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the upload.',
];

if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    respond(["error" => $uploadErrors[$file['error']] ?? 'Upload failed.'], 400);
}

if (!is_uploaded_file($file['tmp_name'])) respond(["error" => "Invalid upload request"], 400);

if ($file['size'] > 5 * 1024 * 1024) {
    respond(["error" => "File too large. Max 5MB"], 400);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

if (!isset($allowed[$mimeType])) {
    respond(["error" => "Invalid file type. Allowed: JPG, PNG, WebP, GIF"], 400);
}

$uploadDir = __DIR__ . '/../uploads/products/';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true)) {
    respond(["error" => "Upload folder cannot be created"], 500);
}

if (!is_writable($uploadDir)) {
    respond(["error" => "Upload folder is not writable"], 500);
}

$filename = 'product_' . $auth['user_id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mimeType];
$filepath = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $filepath)) {
    $url = "uploads/products/" . $filename;
    respond(["success" => true, "image_url" => $url]);
}

respond(["error" => "Failed to upload image. Check XAMPP folder permission."], 500);
