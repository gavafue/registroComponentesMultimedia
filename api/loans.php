<?php
// api/loans.php
require_once 'config.php';

$requestMethod = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// --- POST: Crear un nuevo préstamo ---
if ($requestMethod === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->ci) || !isset($data->name) || !isset($data->equipment_details) || !isset($data->checkout_signature)) {
        sendJsonResponse(['error' => 'Faltan campos obligatorios'], 400);
    }
    
    $stmt = $pdo->prepare("INSERT INTO loans (ci, name, group_name, equipment_details, checkout_time, checkout_signature, status) VALUES (?, ?, ?, ?, NOW(), ?, 'active')");
    
    try {
        $stmt->execute([
            $data->ci, 
            $data->name, 
            isset($data->group_name) ? $data->group_name : null, 
            $data->equipment_details, 
            $data->checkout_signature
        ]);
        sendJsonResponse(['message' => 'Préstamo registrado correctamente', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Error al guardar: ' . $e->getMessage()], 500);
    }
} 
// --- PUT: Registrar devolución o actualizar estado ---
elseif ($requestMethod === 'PUT') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->id)) {
        sendJsonResponse(['error' => 'Falta el ID del préstamo'], 400);
    }

    // Actualización de estado por administrador
    if (isset($data->status) && in_array($data->status, ['returned', 'active'])) {
        if (!isset($_SESSION['user_id'])) {
            sendJsonResponse(['error' => 'No autorizado'], 401);
        }

        if ($data->status === 'active') {
            $stmt = $pdo->prepare("UPDATE loans SET status = 'active', return_time = NULL, return_signature = NULL, return_observation = NULL WHERE id = ?");
            try {
                $stmt->execute([$data->id]);
                if ($stmt->rowCount() > 0) {
                    sendJsonResponse(['message' => 'Registro marcado como en préstamo']);
                } else {
                    sendJsonResponse(['error' => 'Préstamo no encontrado o ya en préstamo'], 404);
                }
            } catch (PDOException $e) {
                sendJsonResponse(['error' => 'Error al guardar: ' . $e->getMessage()], 500);
            }
        }

        if ($data->status === 'returned') {
            $stmt = $pdo->prepare("UPDATE loans SET return_time = NOW(), return_signature = NULL, return_observation = ?, status = 'returned' WHERE id = ? AND status = 'active'");
            try {
                $stmt->execute([
                    isset($data->return_observation) ? $data->return_observation : 'Marcado como devuelto desde administración',
                    $data->id
                ]);
                if ($stmt->rowCount() > 0) {
                    sendJsonResponse(['message' => 'Registro marcado como devuelto']);
                } else {
                    sendJsonResponse(['error' => 'Préstamo no encontrado o ya devuelto'], 404);
                }
            } catch (PDOException $e) {
                sendJsonResponse(['error' => 'Error al guardar: ' . $e->getMessage()], 500);
            }
        }
    }

    // Endpoint público de devolución con firma
    if (!isset($data->return_signature)) {
        sendJsonResponse(['error' => 'Faltan campos obligatorios para la devolución'], 400);
    }
    
    $stmt = $pdo->prepare("UPDATE loans SET return_time = NOW(), return_signature = ?, return_observation = ?, status = 'returned' WHERE id = ? AND status = 'active'");
    
    try {
        $stmt->execute([
            $data->return_signature,
            isset($data->return_observation) ? $data->return_observation : null,
            $data->id
        ]);
        
        if ($stmt->rowCount() > 0) {
            sendJsonResponse(['message' => 'Devolución registrada correctamente']);
        } else {
            sendJsonResponse(['error' => 'Préstamo no encontrado o ya devuelto'], 404);
        }
    } catch (PDOException $e) {
        sendJsonResponse(['error' => 'Error al guardar: ' . $e->getMessage()], 500);
    }
}
// --- GET: Consultar préstamos ---
elseif ($requestMethod === 'GET') {
    if ($action === 'active_by_ci') {
        // Obtener activos para un usuario específico (vista pública)
        if (!isset($_GET['ci'])) {
            sendJsonResponse(['error' => 'Falta cédula'], 400);
        }
        $stmt = $pdo->prepare("SELECT id, equipment_details, checkout_time FROM loans WHERE ci = ? AND status = 'active' ORDER BY checkout_time DESC");
        $stmt->execute([$_GET['ci']]);
        sendJsonResponse($stmt->fetchAll());
    } 
    elseif ($action === 'stats') {
        // Métricas para el dashboard (protegido)
        if (!isset($_SESSION['user_id'])) {
            sendJsonResponse(['error' => 'No autorizado'], 401);
        }
        
        $today = date('Y-m-d');
        
        // Total préstamos hoy
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM loans WHERE DATE(checkout_time) = ?");
        $stmt->execute([$today]);
        $totalToday = $stmt->fetch()['count'];
        
        // Activos (pendientes de devolución)
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM loans WHERE status = 'active'");
        $totalActive = $stmt->fetch()['count'];
        
        // Devueltos hoy
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM loans WHERE status = 'returned' AND DATE(return_time) = ?");
        $stmt->execute([$today]);
        $returnedToday = $stmt->fetch()['count'];
        
        // Retrasados (activos > 12 horas)
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM loans WHERE status = 'active' AND checkout_time < NOW() - INTERVAL 12 HOUR");
        $totalDelayed = $stmt->fetch()['count'];
        
        // Total histórico
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM loans");
        $totalAll = $stmt->fetch()['count'];
        
        sendJsonResponse([
            'today' => (int)$totalToday,
            'active' => (int)$totalActive,
            'returned_today' => (int)$returnedToday,
            'delayed' => (int)$totalDelayed,
            'total' => (int)$totalAll
        ]);
    }
    elseif ($action === 'all' || $action === 'pending') {
        // Rutas protegidas para el administrador
        if (!isset($_SESSION['user_id'])) {
            sendJsonResponse(['error' => 'No autorizado'], 401);
        }
        
        if ($action === 'pending') {
            $stmt = $pdo->query("SELECT * FROM loans WHERE status = 'active' ORDER BY checkout_time ASC");
        } else {
            $stmt = $pdo->query("SELECT * FROM loans ORDER BY id DESC");
        }
        sendJsonResponse($stmt->fetchAll());
    }
    else {
        sendJsonResponse(['error' => 'Acción no válida'], 400);
    }
} 
else {
    sendJsonResponse(['error' => 'Método no permitido'], 405);
}
?>
