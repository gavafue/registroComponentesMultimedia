<?php
// api/config.php
// Definir una ruta local para las sesiones dentro del proyecto
$sessionPath = __DIR__ . '/sesiones';
if (!is_dir($sessionPath)) {
    mkdir($sessionPath, 0777, true);
}
session_save_path($sessionPath);

// Ahora sí, iniciar la sesión
session_start();


$host = 'localhost';
$db_name = 'isbo_prestamos';
$username = 'admin'; // Cambiar si es necesario en lampp
$password = 'admin'; // Cambiar si es necesario en lampp

try {
    $pdo = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $exception) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Connection error: ' . $exception->getMessage()]);
    exit;
}

// Helper function to return JSON responses
function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
?>
