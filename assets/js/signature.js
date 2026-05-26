// assets/js/signature.js

class SignaturePad {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        
        // Setup line style
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#00458a'; // ISBO Blue
        
        this.isEmpty = true;
        
        this.initEvents();
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        // Obtenemos el tamaño real del contenedor
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Guardamos el contenido actual si existe
        let tempImg = null;
        if (!this.isEmpty) {
            tempImg = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Restaurar estilos después del resize
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#00458a';
        
        // Restaurar imagen
        if (tempImg) {
            this.ctx.putImageData(tempImg, 0, 0);
        } else {
            this.clear();
        }
    }
    
    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    initEvents() {
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            this.startDrawing(e);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e);
        }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        this.isEmpty = false;
        const coords = this.getCoordinates(e);
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y);
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        const coords = this.getCoordinates(e);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
    }
    
    stopDrawing() {
        this.isDrawing = false;
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isEmpty = true;
    }
    
    getBase64() {
        if (this.isEmpty) return null;
        return this.canvas.toDataURL('image/png');
    }
}

// Inicializar cuando el DOM esté listo
window.checkoutSignature = null;
window.returnSignature = null;

document.addEventListener('DOMContentLoaded', () => {
    window.checkoutSignature = new SignaturePad('checkout-signature-pad');
    window.returnSignature = new SignaturePad('return-signature-pad');
    
    // Botones de limpiar
    document.querySelectorAll('.btn-clear').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const canvasId = e.target.getAttribute('data-canvas');
            if (canvasId === 'checkout-signature-pad') window.checkoutSignature.clear();
            if (canvasId === 'return-signature-pad') window.returnSignature.clear();
        });
    });
});
