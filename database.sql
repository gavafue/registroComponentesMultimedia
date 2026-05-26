CREATE DATABASE IF NOT EXISTS isbo_prestamos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE isbo_prestamos;

-- Tabla para el Administrador
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar un administrador por defecto (usuario: admin, contraseña: password)
-- NOTA: En producción, cambia la contraseña. 
-- El hash generado aquí es para 'password' usando BCRYPT
INSERT IGNORE INTO users (username, password_hash) VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Tabla para los Préstamos
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ci VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    group_name VARCHAR(50),
    equipment_details TEXT NOT NULL,
    
    checkout_time DATETIME NOT NULL,
    checkout_signature LONGTEXT NOT NULL, -- Almacena base64 de la firma
    
    return_time DATETIME NULL,
    return_signature LONGTEXT NULL, -- Almacena base64 de la firma
    return_observation TEXT NULL,
    
    status ENUM('active', 'returned') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
