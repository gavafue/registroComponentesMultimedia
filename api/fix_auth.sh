#!/bin/bash

# Colores para la salida en consola
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

HTML_DIR="/var/www/html"
SESIONES_DIR="$HTML_DIR/api/sesiones"
CONFIG_FILE="$HTML_DIR/api/config.php"

echo -e "${YELLOW}=== Iniciando script de reparación de entorno para Auth ===${NC}"

# 1. Verificar que el script corra como root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Este script debe ejecutarse como root (sudo).${NC}"
  exit 1
fi

# 2. Corregir Propietario y Permisos Generales
echo -e "\n${YELLOW}[1/4] Ajustando propietario (apache:apache) y permisos...${NC}"
if [ -d "$HTML_DIR" ]; then
    chown -R apache:apache $HTML_DIR
    find $HTML_DIR -type d -exec chmod 755 {} \;
    find $HTML_DIR -type f -exec chmod 644 {} \;
    echo -e "${GREEN}[OK] Propietario y permisos base aplicados.${NC}"
else
    echo -e "${RED}[ERROR] No se encontró el directorio $HTML_DIR${NC}"
    exit 1
fi

# 3. Asegurar la carpeta de sesiones y archivo de configuración
echo -e "\n${YELLOW}[2/4] Asegurando archivos críticos...${NC}"
if [ -d "$SESIONES_DIR" ]; then
    # La carpeta de sesiones necesita permisos de escritura completos para el grupo/usuario apache
    chmod 775 "$SESIONES_DIR"
    echo -e "${GREEN}[OK] Permisos de la carpeta de sesiones ajustados a 775.${NC}"
else
    echo -e "${YELLOW}[AVISO] No se encontró la carpeta 'api/sesiones'. Si usas sesiones nativas de PHP, podría ser un problema.${NC}"
fi

if [ -f "$CONFIG_FILE" ]; then
    # El archivo de configuración debe ser privado para apache
    chmod 600 "$CONFIG_FILE"
    echo -e "${GREEN}[OK] Archivo config.php protegido (600).${NC}"
fi

# 4. Reparar Contextos de SELinux (Crucial en CentOS 9)
echo -e "\n${YELLOW}[3/4] Reparando políticas y contextos de SELinux...${NC}"
if command -v getenforce &> /dev/null; then
    STATUS=$(getenforce)
    echo -e "Estado actual de SELinux: ${YELLOW}$STATUS${NC}"
    
    if [ "$STATUS" != "Disabled" ]; then
        # Restaurar contexto por defecto de Apache a la web
        restorecon -R -v $HTML_DIR > /dev/null
        
        # Permitir explícitamente escritura en la carpeta de sesiones
        if [ -d "$SESIONES_DIR" ]; then
            semanage fcontext -a -t httpd_sys_rw_content_t "$SESIONES_DIR(/.*)?" 2>/dev/null
            chcon -R -t httpd_sys_rw_content_t "$SESIONES_DIR"
            echo -e "${GREEN}[OK] Contexto de escritura aplicado a 'api/sesiones'.${NC}"
        fi
        
        # Permitir que Apache pueda enviar cookies/peticiones si estuviera bloqueado
        setsebool -P httpd_can_network_connect 1 2>/dev/null
        setsebool -P httpd_graceful_shutdown 1 2>/dev/null
        echo -e "${GREEN}[OK] Booleans de SELinux para Apache actualizados.${NC}"
    else
        echo -e "${YELLOW}[AVISO] SELinux está deshabilitado. Omitiendo este paso.${NC}"
    fi
else
    echo -e "${YELLOW}[AVISO] SELinux no está instalado en este sistema.${NC}"
fi

# 5. Reiniciar Servicios para aplicar cambios
echo -e "\n${YELLOW}[4/4] Reiniciando servicios web...${NC}"
systemctl restart httpd
if systemctl is-active --quiet php-fpm; then
    systemctl restart php-fpm
    echo -e "${GREEN}[OK] Apache y PHP-FPM reiniciados correctamente.${NC}"
else
    echo -e "${GREEN}[OK] Apache reiniciado correctamente.${NC}"
fi

echo -e "\n${GREEN}=== Reparación de permisos y sistema completada ===${NC}"
echo -e "${YELLOW}Nota:${NC} Si el error 401 persiste, revisa los logs en vivo usando el siguiente comando:"
echo -e "${GREEN}tail -f /var/log/httpd/error_log${NC}"
