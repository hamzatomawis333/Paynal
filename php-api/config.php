<?php
// CORS
//
// The frontend talks to this API same-origin through the Vite dev proxy
// (see vite.config.ts), so cross-origin requests are not actually required.
// An allowlist is still applied for the case where you open the API directly.
//
// Reflecting an arbitrary Origin while sending Allow-Credentials is not safe,
// so an unlisted origin simply receives no Allow-Origin header and the browser
// blocks the response.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowOrigin = '';

if ($origin !== '') {
    $allowedOrigins = [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
    ];

    // The dev server binds 0.0.0.0:8080, so also allow its LAN address on the
    // dev port only. Private ranges and no other ports.
    if (preg_match('#^https?://(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):8080$#', $origin)) {
        $allowedOrigins[] = $origin;
    }

    if (in_array($origin, $allowedOrigins, true)) {
        $allowOrigin = $origin;
    }
}

if ($allowOrigin !== '') {
    header("Access-Control-Allow-Origin: $allowOrigin");
    header("Access-Control-Allow-Credentials: true");
}
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// Global error handling
//
// Every endpoint sets Content-Type: application/json above. If a PHP warning
// or fatal is then printed into the body, the client receives status 200 with
// a JSON content-type and an unparseable payload - which is very hard to
// diagnose. So: never display errors to the client, always log them to a file
// outside the web root, and convert every PHP error into a clean JSON 500.
// ============================================
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
ini_set('error_log', sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'maranao_api_errors.log');

// Turn warnings/notices/deprecations into catchable exceptions instead of
// silently corrupting the response.
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function ($e) {
    error_log(sprintf(
        '[%s] %s in %s:%d',
        $e::class,
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }

    $response = ['error' => 'Internal server error'];

    // Keep the useful detail for local dev requests, never for public ones.
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (preg_match('#^(localhost|127\.0\.0\.1)(:\d+)?$#', $host)) {
        $response['detail'] = $e->getMessage();
        $response['at'] = basename($e->getFile()) . ':' . $e->getLine();
    }

    echo json_encode($response);
    exit();
});

$host = "localhost";
$db   = "maranao_treasures_db";
$user = "root";
$pass = "";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit();
}

$conn->set_charset("utf8mb4");

// JWT signing secret.
//
// It must never be committed: anyone holding this string can mint a valid
// admin token offline and the API will accept it. Resolution order:
//   1. getenv('JWT_SECRET')
//   2. the contents of getenv('JWT_SECRET_FILE'), or the default path below,
//      which sits OUTSIDE the document root so it cannot be fetched over HTTP.
//
// Rotating this invalidates every issued token, so everyone must sign in again.
function resolveJwtSecret() {
    $fromEnv = getenv('JWT_SECRET');
    if (is_string($fromEnv) && strlen($fromEnv) >= 32) {
        return $fromEnv;
    }

    $path = getenv('JWT_SECRET_FILE');
    if (!is_string($path) || $path === '') {
        $path = 'C:\\xampp\\maranao_jwt_secret.txt';
    }

    if (is_readable($path)) {
        $contents = trim((string) file_get_contents($path));
        if (strlen($contents) >= 32) {
            return $contents;
        }
    }

    respond([
        'error' => 'Server misconfigured: JWT secret not found',
        'hint' => 'Set the JWT_SECRET environment variable, or create a file with at least 32 random characters at: ' . $path,
    ], 500);
}

define('JWT_SECRET', resolveJwtSecret());

// Helper: send JSON response
function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

// Helper: get JSON body
function getBody() {
    return json_decode(file_get_contents("php://input"), true) ?? [];
}

// Helper: read a bounded, single-line string field from a request payload.
//
// Values that are absent, null, empty or not scalar collapse to ''. Values
// that are too long or contain control characters are rejected with a 400
// rather than truncated or stripped: silently rewriting a shipping address
// would deliver goods to the wrong place, which is worse than refusing it.
function data_string(array $source, string $key, int $maxLen) {
    if (!array_key_exists($key, $source)) {
        return '';
    }

    $value = $source[$key];
    if ($value === null || is_array($value) || is_object($value) || is_bool($value)) {
        return '';
    }

    $value = trim((string) $value);
    if ($value === '') {
        return '';
    }

    // preg_match with the /u modifier returns false on malformed UTF-8, so a
    // valid subject always yields 1 here.
    if (preg_match('//u', $value) !== 1) {
        respond(["error" => "Field '$key' is not valid UTF-8"], 400);
    }

    // Reject the entire C0 range plus DEL. Tab/CR/LF are included on purpose:
    // these fields are composed into a single-line shipping_address, so an
    // embedded newline would corrupt the stored address and could be used to
    // forge extra lines in logs or exported reports.
    if (preg_match('/[\x00-\x1F\x7F]/', $value)) {
        respond(["error" => "Field '$key' contains invalid control characters"], 400);
    }

    // Count characters, not bytes: strlen() would cap a 200-character limit
    // at roughly 66 characters of Arabic or accented text.
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $maxLen) {
        respond(["error" => "Field '$key' must be $maxLen characters or fewer"], 400);
    }

    return $value;
}

// Helper: base64url encode/decode
//
// RFC 7519 requires base64url, not standard base64. Standard base64 emits
// '+', '/' and '=', which corrupt a token if it ever travels in a URL, a
// cookie or a log file.
function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder !== 0) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

// Helper: create JWT token
function createToken($userId, $role) {
    $header = base64UrlEncode(json_encode(["alg" => "HS256", "typ" => "JWT"]));
    $payload = base64UrlEncode(json_encode([
        "user_id" => $userId,
        "role" => $role,
        "exp" => time() + 86400 // 24 hours
    ]));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

// Helper: verify JWT and return payload
function verifyToken() {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if (!preg_match('/Bearer\s(\S+)/', $auth, $matches)) {
        respond(["error" => "Token required"], 401);
    }

    $parts = explode('.', $matches[1]);
    if (count($parts) !== 3) respond(["error" => "Invalid token"], 401);

    [$header, $payload, $signature] = $parts;
    $validSig = base64UrlEncode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

    // Constant-time comparison: a plain !== leaks the signature byte by byte.
    if (!hash_equals($validSig, $signature)) respond(["error" => "Invalid token"], 401);

    $data = json_decode(base64UrlDecode($payload), true);
    if (!is_array($data) || !isset($data['user_id'], $data['exp'])) {
        respond(["error" => "Invalid token"], 401);
    }
    if ($data['exp'] < time()) respond(["error" => "Token expired"], 401);

    // Never trust the role claim inside the token. Re-read the user so that a
    // deactivated, deleted or demoted account loses access immediately instead
    // of keeping full permissions until the token expires (up to 24 hours).
    global $conn;
    $stmt = $conn->prepare("SELECT id, role, is_active FROM users WHERE id = ?");
    $stmt->bind_param("i", $data['user_id']);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) respond(["error" => "Invalid token"], 401);
    if ((int)$user['is_active'] !== 1) respond(["error" => "Account is inactive"], 403);

    $data['role'] = $user['role'];

    return $data;
}
