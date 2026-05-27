<?php
// api/auth.php
require_once 'config.php';

$requestMethod = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($requestMethod === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->username) || !isset($data->password)) {
        sendJsonResponse(['error' => 'Faltan credenciales'], 400);
    }
    
    $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
    $stmt->execute([$data->username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($data->password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        sendJsonResponse(['message' => 'Login exitoso']);
    } else {
        sendJsonResponse(['error' => 'Credenciales inválidas'], 401);
    }
} 
elseif ($requestMethod === 'GET' && $action === 'check') {
    if (isset($_SESSION['user_id'])) {
        sendJsonResponse(['logged_in' => true, 'username' => $_SESSION['username']]);
    } else {
        // Devolver 200 con logged_in:false para que la comprobación no se trate como error
        sendJsonResponse(['logged_in' => false], 200);
    }
}
elseif ($requestMethod === 'POST' && $action === 'logout') {
    session_destroy();
    sendJsonResponse(['message' => 'Logout exitoso']);
} 
else {
    sendJsonResponse(['error' => 'Acción no válida'], 400);
}
?>
