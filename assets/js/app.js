// assets/js/app.js

// --- Utilidades ---
const UI = {
    showToast(message, type = 'info') {
        const area = document.getElementById('notification-area');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-triangle';

        toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        area.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    switchView(viewId) {
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.tab-btn[data-target="${viewId}"]`);
        if (btn) btn.classList.add('active');

        if (viewId === 'view-return') {
            resetReturnInactivityTimer();
        } else {
            clearReturnInactivityTimer();
        }

        // Redimensionar canvas si la vista tiene firmas (arregla error de canvas oculto)
        setTimeout(() => {
            if (window.checkoutSignature) window.checkoutSignature.resizeCanvas();
            if (window.returnSignature) window.returnSignature.resizeCanvas();
        }, 50);
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },

    escapeHTML(value) {
        if (value === null || value === undefined) return '-';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    updateMontevideoClock() {
        const clockEl = document.getElementById('header-clock');
        const dateEl = document.getElementById('header-date');
        if (!clockEl || !dateEl) return;

        const now = new Date();
        const timeString = now.toLocaleTimeString('es-UY', {
            timeZone: 'America/Montevideo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        const dateString = now.toLocaleDateString('es-UY', {
            timeZone: 'America/Montevideo',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

        clockEl.textContent = timeString;
        dateEl.textContent = dateString;
    },

    // Animación de conteo para métricas
    animateCount(elementId, target) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const duration = 600;
        const start = 0;
        const startTime = performance.now();

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing: easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (target - start) * eased);
            el.textContent = current;
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    },

    // Renderizar miniatura de firma o placeholder
    renderSignatureThumb(base64, label) {
        if (base64 && base64.startsWith('data:image')) {
            return `<img src="${base64}" class="signature-thumb" alt="${label}" data-sig-label="${label}" data-sig-src="${base64}">`;
        }
        return '<span class="no-signature">-</span>';
    }
};

// --- Navegación ---
let returnViewInactivityTimeout = null;
const RETURN_VIEW_INACTIVITY_MS = 5 * 60 * 1000;

function clearReturnInactivityTimer() {
    if (returnViewInactivityTimeout) {
        clearTimeout(returnViewInactivityTimeout);
        returnViewInactivityTimeout = null;
    }
}

function resetReturnInactivityTimer() {
    clearReturnInactivityTimer();
    if (!document.getElementById('view-return') || document.getElementById('view-return').classList.contains('hidden')) {
        return;
    }
    returnViewInactivityTimeout = setTimeout(() => {
        if (!document.getElementById('view-return').classList.contains('hidden')) {
            UI.switchView('view-checkout');
            UI.showToast('No se usó la devolución en 5 minutos. Volviendo a Retirar.', 'info');
        }
    }, RETURN_VIEW_INACTIVITY_MS);
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        UI.switchView(e.currentTarget.getAttribute('data-target'));
    });
});

document.querySelectorAll('.equipment-keyword-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        appendEquipmentKeyword(btn.textContent.trim());
    });
});

function appendEquipmentKeyword(keyword) {
    const field = document.getElementById('equipment');
    if (!field) return;
    const current = field.value.trim();
    if (!current) {
        field.value = keyword;
    } else {
        const separator = current.endsWith(',') || current.endsWith('\n') ? ' ' : ', ';
        field.value = `${current}${separator}${keyword}`;
    }
    field.focus();
}

// --- Lógica: Registrar Retiro con Optimizaciones ---

// Atajos de teclado en formulario de retiro
const checkoutForm = document.getElementById('checkout-form');

// Enter en campos de texto (excepto textarea)
['ci', 'name', 'group'].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    field.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Si es el último campo antes de firma, enfoca la firma
            if (fieldId === 'group') {
                // Hacer scroll suave al canvas de firma
                document.querySelector('.signature-group').scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // Ir al siguiente campo
                const fields = ['ci', 'name', 'group', 'equipment'];
                const currentIndex = fields.indexOf(fieldId);
                if (currentIndex < fields.length - 1) {
                    document.getElementById(fields[currentIndex + 1]).focus();
                }
            }
        }
    });
});

// Removed keyboard shortcut submission (Ctrl+Enter / Ctrl+X) because it sent empty records.
// The textarea keeps its HTML placeholder and normal form submission via the Confirmar button.

checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (window.checkoutSignature.isEmpty) {
        UI.showToast('Por favor, dibuja tu firma', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    const formData = {
        ci: document.getElementById('ci').value,
        name: document.getElementById('name').value,
        group_name: document.getElementById('group').value,
        equipment_details: document.getElementById('equipment').value,
        checkout_signature: window.checkoutSignature.getBase64()
    };

    try {
        await API.createLoan(formData);

        // Vibración táctil de éxito
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

        UI.showToast('✓ ¡Registrado exitosamente!', 'success');

        // Limpiar formulario y firmas
        e.target.reset();
        window.checkoutSignature.clear();

        // Scroll suave a inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Auto-focus en primer campo después de un pequeño delay
        setTimeout(() => {
            const ciField = document.getElementById('ci');
            ciField.focus();
            ciField.select(); // Seleccionar el texto si lo hay para reemplazarlo fácilmente
        }, 300);
    } catch (error) {
        UI.showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Retiro';
    }
});

document.getElementById('btn-clear-checkout').addEventListener('click', (e) => {
    e.preventDefault();
    checkoutForm.reset();
    window.checkoutSignature.clear();
    document.getElementById('ci').focus();
});


// --- Lógica: Devolución ---

// al presionar enter en el input de cedula
document.getElementById('return-ci').addEventListener('keydown', async (e) => {
    resetReturnInactivityTimer();

    if (e.key === 'Enter') {
        document.getElementById('btn-search-loans').click();
    }

    if (e.key === 'Escape') {
        document.getElementById('btn-clear-search-ci').click();
    }
});


function clearReturnCiInput() {
    const ciInput = document.getElementById('return-ci');
    if (!ciInput) return;
    ciInput.value = '';
    ciInput.setAttribute('value', '');
}

document.getElementById('btn-clear-search-ci').addEventListener('click', (e) => {
    e.preventDefault();
    resetReturnInactivityTimer();
    clearReturnCiInput();
    document.getElementById('return-loan-id').value = '';
    document.getElementById('return-details').classList.add('hidden');
    document.getElementById('active-loans-container').classList.add('hidden');
    document.getElementById('return-ci').focus();
});

document.getElementById('btn-search-loans').addEventListener('click', async () => {
    resetReturnInactivityTimer();
    const ci = document.getElementById('return-ci').value;
    if (!ci) {
        UI.showToast('Ingresa tu cédula', 'error');
        return;
    }

    if (ci.length < 7 || ci.length > 8) {
        UI.showToast('La cédula debe tener 7 u 8 dígitos', 'error');
        return;
    }

    try {
        const loans = await API.getActiveLoansByCI(ci);
        const container = document.getElementById('active-loans-container');
        let list = document.getElementById('loans-list');

        if (!list) {
            list = document.createElement('div');
            list.id = 'loans-list';
            list.className = 'loans-list';
            list.setAttribute('role', 'list');
            list.setAttribute('aria-label', 'Préstamos activos para seleccionar');
            container.appendChild(list);
        }

        list.innerHTML = '';

        if (loans.length === 0) {
            list.innerHTML = '<p class="text-muted"><i class="fas fa-info-circle"></i> No tienes préstamos activos pendientes de devolver.</p>';
            document.getElementById('return-details').classList.add('hidden');
            document.getElementById('return-loan-id').value = '';
        } else {
            loans.forEach(loan => {
                const item = document.createElement('div');
                item.className = 'loan-item';
                item.innerHTML = `
                    <div class="loan-details">
                        <h4>${UI.escapeHTML(loan.equipment_details)}</h4>
                        <p>Retirado el: ${UI.formatDate(loan.checkout_time)}</p>
                    </div>
                    <div><i class="fas fa-chevron-right" style="color: #ccc;"></i></div>
                `;
                item.addEventListener('click', () => {
                    resetReturnInactivityTimer();
                    document.querySelectorAll('.loan-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    document.getElementById('return-loan-id').value = loan.id;
                    document.getElementById('return-details').classList.remove('hidden');
                    setTimeout(() => window.returnSignature.resizeCanvas(), 50);
                });
                list.appendChild(item);
            });
        }

        container.classList.remove('hidden');
    } catch (error) {
        UI.showToast(error.message, 'error');
    }
});

document.getElementById('return-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    resetReturnInactivityTimer();

    if (window.returnSignature.isEmpty) {
        UI.showToast('Por favor, firma la devolución', 'error');
        return;
    }

    const id = document.getElementById('return-loan-id').value;
    if (!id) {
        UI.showToast('Selecciona un préstamo para devolver', 'error');
        return;
    }

    const obs = document.getElementById('return-obs').value;
    const sign = window.returnSignature.getBase64();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        await API.returnLoan(id, sign, obs);
        UI.showToast('¡Devolución confirmada!', 'success');

        // Limpiar formulario y datos de búsqueda
        e.target.reset();
        window.returnSignature.clear();
        clearReturnCiInput();
        document.getElementById('return-details').classList.add('hidden');

        // Limpiar lista de préstamos y volver arriba
        const loansContainer = document.getElementById('active-loans-container');
        const loansList = document.getElementById('loans-list');
        if (loansList) loansList.innerHTML = '';
        if (loansContainer) loansContainer.classList.add('hidden');
        document.getElementById('return-details').classList.add('hidden');
        window.scrollTo(0, 0);
        setTimeout(() => {
            clearReturnCiInput();
            document.getElementById('return-ci').focus();
        }, 100);
    } catch (error) {
        UI.showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-double"></i> Confirmar Devolución';
    }
});

// Botón limpiar formulario de devolución
document.getElementById('btn-clear-return').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('return-form').reset();
    document.getElementById('return-loan-id').value = '';
    window.returnSignature.clear();

    document.getElementById('return-details').classList.add('hidden');
    const loansList = document.getElementById('loans-list');
    if (loansList) loansList.innerHTML = '';
    document.getElementById('active-loans-container').classList.add('hidden');

    setTimeout(() => {
        document.getElementById('return-ci').focus();
        document.getElementById('return-ci').value = '';
    }, 50);
});

// --- Lógica: Administrador ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    try {
        await API.login(u, p);
        UI.showToast('Login exitoso', 'success');
        loadAdminDashboard();
    } catch (error) {
        UI.showToast(error.message, 'error');
    }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await API.logout();
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('admin-login-card').classList.remove('hidden');
    document.getElementById('login-form').reset();
});

document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));

        const target = e.target.getAttribute('data-target');
        document.getElementById(target).classList.remove('hidden');
        e.target.classList.add('active');

        if (target === 'admin-history') {
            loadHistoryTable();
        }
        if (target === 'admin-reports') {
            loadReportsTab();
        }
    });
});


// --- Dashboard: Cargar todo ---
async function loadAdminDashboard() {
    try {
        const check = await API.checkAuth();
        if (check.logged_in) {
            document.getElementById('admin-login-card').classList.add('hidden');
            document.getElementById('admin-dashboard').classList.remove('hidden');
            loadMetrics();
            loadPendingTable();
        }
    } catch (e) {
        console.log("No logueado");
    }
}

// --- Métricas KPI ---
async function loadMetrics() {
    try {
        const stats = await API.getStats();
        UI.animateCount('metric-today', stats.today);
        UI.animateCount('metric-active', stats.active);
        UI.animateCount('metric-returned', stats.returned_today);
        UI.animateCount('metric-delayed', stats.delayed);

        // También actualizar pestaña reportes
        document.getElementById('report-total').textContent = stats.total;
        document.getElementById('report-active').textContent = stats.active;
        document.getElementById('report-delayed').textContent = stats.delayed;
    } catch (e) {
        console.error('Error cargando métricas:', e);
    }
}

// --- Tabla Pendientes (con firma de retiro) ---
async function loadPendingTable() {
    try {
        const loans = await API.getPendingLoans();
        const tbody = document.querySelector('#table-pending tbody');
        tbody.innerHTML = '';

        if (loans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay equipos pendientes de devolución.</td></tr>';
            return;
        }

        loans.forEach(loan => {
            const tr = document.createElement('tr');

            // Lógica simple de alerta: Si pasó más de un día, alerta.
            const checkoutDate = new Date(loan.checkout_time);
            const now = new Date();
            const diffHours = (now - checkoutDate) / (1000 * 60 * 60);

            // Use compact icons for status: en préstamo, atrasado
            let badge = `<span class="status-icon pending" title="En Préstamo"><i class="fas fa-clock"></i></span>`;
            if (diffHours > 12) {
                badge = `<span class="status-icon alert" title="Atrasado"><i class="fas fa-exclamation-triangle"></i></span>`;
            }

            tr.innerHTML = `
                <td data-label="Fecha Retiro">${UI.formatDate(loan.checkout_time)}</td>
                <td data-label="Cédula">${UI.escapeHTML(loan.ci)}</td>
                <td data-label="Nombre">${UI.escapeHTML(loan.name)}</td>
                <td data-label="Grupo">${UI.escapeHTML(loan.group_name || '-')}</td>
                <td data-label="Equipamiento" class="wrap-cell">${UI.escapeHTML(loan.equipment_details)}</td>
                <td data-label="Firma Retiro">${UI.renderSignatureThumb(loan.checkout_signature, 'Firma de Retiro - ' + loan.name)}</td>
                <td data-label="Alerta">${badge}</td>
                <td data-label="Acción" class="admin-actions-cell">
                    <button type="button" class="btn btn-icon btn-secondary admin-action-btn" data-action="edit-details" data-id="${loan.id}" data-equipment="${UI.escapeHTML(loan.equipment_details)}" aria-label="Editar equipamiento"><i class="fas fa-edit"></i></button>
                    <button type="button" class="btn btn-icon btn-primary admin-action-btn" data-action="mark-returned" data-id="${loan.id}" aria-label="Marcar como devuelto"><i class="fas fa-check"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        UI.showToast(e.message, 'error');
    }
}

// --- Variables globales para historial (para filtros) ---
let allHistoryLoans = [];
let currentHistoryLoans = [];
let historyPage = 1;
const HISTORY_PAGE_SIZE = 10;

function getHistoryFilterCriteria() {
    const search = document.getElementById('admin-search')?.value.trim().toLowerCase() || '';
    const from = document.getElementById('date-from')?.value;
    const to = document.getElementById('date-to')?.value;
    const status = document.getElementById('status-filter')?.value;
    return { search, from, to, status };
}

function applyHistoryFilters() {
    const { search, from, to, status } = getHistoryFilterCriteria();
    let filtered = allHistoryLoans.filter(loan => {
        const loanDate = loan.checkout_time.split(' ')[0];
        if (from && to && !(loanDate >= from && loanDate <= to)) return false;
        if (from && !to && loanDate < from) return false;
        if (to && !from && loanDate > to) return false;
        if (status && loan.status !== status) return false;
        if (search) {
            const query = search.toLowerCase();
            const matchesName = loan.name && loan.name.toLowerCase().includes(query);
            const matchesCi = loan.ci && loan.ci.toLowerCase().includes(query);
            if (!matchesName && !matchesCi) return false;
        }
        return true;
    });
    historyPage = 1;
    renderHistoryTable(filtered, historyPage);
    UI.showToast(`Mostrando ${filtered.length} registro(s)`, 'info');
}

async function loadHistoryTable() {
    try {
        const loans = await API.getAllLoans();
        // Asegurar orden consistente: mostrar primero los retiros más recientes
        loans.sort((a, b) => new Date(b.checkout_time) - new Date(a.checkout_time));
        allHistoryLoans = loans;
        currentHistoryLoans = loans;
        historyPage = 1; // resetear a primera página al cargar
        renderHistoryTable(loans, historyPage);
    } catch (e) {
        UI.showToast(e.message, 'error');
    }
}

function renderHistoryTable(loans, page = 1) {
    currentHistoryLoans = loans;
    historyPage = Math.max(1, Math.min(page, Math.ceil(loans.length / HISTORY_PAGE_SIZE) || 1));
    const tbody = document.querySelector('#table-history tbody');
    tbody.innerHTML = '';

    if (loans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">No hay registros para mostrar.</td></tr>';
        renderHistoryPagination(0);
        return;
    }

    const totalPages = Math.ceil(loans.length / HISTORY_PAGE_SIZE);
    const startIndex = (historyPage - 1) * HISTORY_PAGE_SIZE;
    const pageLoans = loans.slice(startIndex, startIndex + HISTORY_PAGE_SIZE);

    pageLoans.forEach(loan => {
        const tr = document.createElement('tr');
        // Determine status icon: returned, delayed (atrasado) or pending
        let status = '';
        if (loan.status === 'returned') {
            status = '<span class="status-icon ok" title="Devuelto"><i class="fas fa-check-circle"></i></span>';
        } else {
            const checkoutDate = new Date(loan.checkout_time);
            const now = new Date();
            const diffHours = (now - checkoutDate) / (1000 * 60 * 60);
            if (diffHours > 12) {
                status = '<span class="status-icon alert" title="Atrasado"><i class="fas fa-exclamation-triangle"></i></span>';
            } else {
                status = '<span class="status-icon pending" title="Pendiente"><i class="fas fa-clock"></i></span>';
            }
        }

        const actionButton = loan.status === 'returned'
            ? `<button type="button" class="btn btn-secondary btn-sm" data-action="mark-active" data-id="${loan.id}">Marcar en préstamo</button>`
            : `<button type="button" class="btn btn-primary btn-sm" data-action="mark-returned" data-id="${loan.id}">Marcar devuelto</button>`;

        tr.innerHTML = `
            <td data-label="ID">#${loan.id}</td>
            <td data-label="Retiro">${UI.formatDate(loan.checkout_time)}</td>
            <td data-label="Cédula">${UI.escapeHTML(loan.ci)}</td>
            <td data-label="Nombre">${UI.escapeHTML(loan.name)}</td>
            <td data-label="Grupo">${UI.escapeHTML(loan.group_name || '-')}</td>
            <td data-label="Equipamiento" class="wrap-cell">${UI.escapeHTML(loan.equipment_details)}</td>
            <td data-label="Firma Retiro">${UI.renderSignatureThumb(loan.checkout_signature, 'Firma de Retiro - ' + loan.name)}</td>
            <td data-label="Devolución">${loan.status === 'returned' ? UI.formatDate(loan.return_time) : '-'}</td>
            <td data-label="Firma Devolución">${loan.status === 'returned' ? UI.renderSignatureThumb(loan.return_signature, 'Firma de Devolución - ' + loan.name) : '<span class="no-signature">-</span>'}</td>
            <td data-label="Observaciones" class="wrap-cell">${UI.escapeHTML(loan.return_observation || '-')}</td>
            <td data-label="Estado">${status}</td>
            <td data-label="Acción" class="admin-actions-cell">
                <button type="button" class="btn btn-icon btn-secondary admin-action-btn" data-action="edit-details" data-id="${loan.id}" data-equipment="${UI.escapeHTML(loan.equipment_details)}" aria-label="Editar equipamiento"><i class="fas fa-edit"></i></button>
                ${loan.status === 'returned'
                ? `<button type="button" class="btn btn-icon btn-primary admin-action-btn" data-action="mark-active" data-id="${loan.id}" aria-label="Marcar en préstamo"><i class="fas fa-undo"></i></button>`
                : `<button type="button" class="btn btn-icon btn-primary admin-action-btn" data-action="mark-returned" data-id="${loan.id}" aria-label="Marcar como devuelto"><i class="fas fa-check"></i></button>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
    renderHistoryPagination(Math.ceil(loans.length / HISTORY_PAGE_SIZE));
}

function renderHistoryPagination(totalPages) {
    const pagination = document.getElementById('history-pagination');
    const prevBtn = document.getElementById('history-prev-page');
    const nextBtn = document.getElementById('history-next-page');
    const pageInfo = document.getElementById('history-page-info');

    if (!pagination || !prevBtn || !nextBtn || !pageInfo) return;

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    pageInfo.textContent = `Página ${historyPage} de ${totalPages}`;
    prevBtn.disabled = historyPage <= 1;
    nextBtn.disabled = historyPage >= totalPages;
}

function changeHistoryPage(offset) {
    const totalPages = Math.ceil(currentHistoryLoans.length / HISTORY_PAGE_SIZE);
    const nextPage = Math.max(1, Math.min(historyPage + offset, totalPages));
    if (nextPage === historyPage) return;
    historyPage = nextPage;
    renderHistoryTable(currentHistoryLoans, historyPage);
}

async function updateLoanStatusFromAdmin(id, status) {
    try {
        const observation = status === 'returned'
            ? 'Marcado como devuelto desde administración'
            : '';

        await API.updateLoanStatus(id, status, observation);
        UI.showToast(`Registro ${status === 'returned' ? 'marcado como devuelto' : 'marcado como en préstamo'}`, 'success');
        loadPendingTable();
        if (!document.getElementById('admin-history').classList.contains('hidden')) {
            loadHistoryTable();
        }
    } catch (e) {
        UI.showToast(e.message, 'error');
    }
}

function openEditLoanModal(id, currentEquipment) {
    document.getElementById('edit-loan-id').value = id;
    document.getElementById('edit-loan-equipment').value = currentEquipment || '';
    document.getElementById('edit-loan-modal').classList.remove('hidden');
    document.getElementById('edit-loan-equipment').focus();
}

function closeEditLoanModal() {
    document.getElementById('edit-loan-modal').classList.add('hidden');
}

async function submitEditLoanForm(event) {
    event.preventDefault();
    const id = document.getElementById('edit-loan-id').value;
    const equipment = document.getElementById('edit-loan-equipment').value.trim();

    if (!equipment) {
        UI.showToast('La descripción no puede quedar vacía', 'error');
        return;
    }

    try {
        await API.updateLoanDetails(id, { equipment_details: equipment });
        UI.showToast('Equipamiento actualizado correctamente', 'success');
        closeEditLoanModal();
        loadPendingTable();
        if (!document.getElementById('admin-history').classList.contains('hidden')) {
            loadHistoryTable();
        }
    } catch (e) {
        UI.showToast(e.message, 'error');
    }
}

document.querySelector('#table-pending tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'mark-returned') {
        await updateLoanStatusFromAdmin(id, 'returned');
    }
    if (action === 'edit-details') {
        openEditLoanModal(id, btn.dataset.equipment);
    }
});

document.querySelector('#table-history tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'mark-returned') {
        await updateLoanStatusFromAdmin(id, 'returned');
    }
    if (action === 'mark-active') {
        await updateLoanStatusFromAdmin(id, 'active');
    }
    if (action === 'edit-details') {
        openEditLoanModal(id, btn.dataset.equipment);
    }
});

// Edit Loan Modal Behavior
const editLoanForm = document.getElementById('edit-loan-form');
if (editLoanForm) {
    editLoanForm.addEventListener('submit', submitEditLoanForm);
}

const closeEditLoanModalBtn = document.getElementById('close-edit-loan-modal');
if (closeEditLoanModalBtn) {
    closeEditLoanModalBtn.addEventListener('click', closeEditLoanModal);
}

const cancelEditLoanBtn = document.getElementById('cancel-edit-loan');
if (cancelEditLoanBtn) {
    cancelEditLoanBtn.addEventListener('click', closeEditLoanModal);
}

const editLoanModalElement = document.getElementById('edit-loan-modal');
if (editLoanModalElement) {
    editLoanModalElement.addEventListener('click', (e) => {
        if (e.target === editLoanModalElement) {
            closeEditLoanModal();
        }
    });
}

// --- Filtros de fecha ---
document.getElementById('btn-filter-dates').addEventListener('click', () => {
    applyHistoryFilters();
});

document.getElementById('btn-clear-filter').addEventListener('click', () => {
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('admin-search').value = '';
    historyPage = 1;
    renderHistoryTable(allHistoryLoans, historyPage);
});

document.getElementById('admin-search').addEventListener('input', () => {
    applyHistoryFilters();
});

document.getElementById('history-prev-page').addEventListener('click', () => {
    changeHistoryPage(-1);
});

document.getElementById('history-next-page').addEventListener('click', () => {
    changeHistoryPage(1);
});

document.getElementById('btn-export-filtered-pdf').addEventListener('click', () => {
    if (!currentHistoryLoans || currentHistoryLoans.length === 0) {
        UI.showToast('No hay resultados filtrados para exportar', 'error');
        return;
    }
    generatePDFReport('filtered', currentHistoryLoans);
});

// --- Pestaña Reportes ---
async function loadReportsTab() {
    try {
        const stats = await API.getStats();
        document.getElementById('report-total').textContent = stats.total;
        document.getElementById('report-active').textContent = stats.active;
        document.getElementById('report-delayed').textContent = stats.delayed;
    } catch (e) {
        console.error('Error cargando reportes:', e);
    }
}

// --- Modal de firma ---
document.addEventListener('click', (e) => {
    const thumb = e.target.closest('.signature-thumb');
    if (thumb) {
        const modal = document.getElementById('signature-modal');
        document.getElementById('sig-modal-title').textContent = thumb.dataset.sigLabel || 'Firma';
        document.getElementById('sig-modal-img').src = thumb.dataset.sigSrc;
        modal.classList.remove('hidden');
    }
});

document.getElementById('close-sig-modal').addEventListener('click', () => {
    document.getElementById('signature-modal').classList.add('hidden');
});

document.getElementById('signature-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
    }
});

// --- Generación de PDF con firmas ---

async function generatePDFReport(filterType = 'all', loanSet = null) {
    UI.showToast('Generando PDF...', 'info');

    try {
        // Obtener datos
        const stats = await API.getStats();
        const loans = loanSet || (filterType === 'pending' ? await API.getPendingLoans() : await API.getAllLoans());

        // Crear el contenedor de renderizado — VISIBLE en pantalla para que html2canvas funcione
        const renderArea = document.createElement('div');
        renderArea.className = 'pdf-render-area';

        renderArea.style.position = 'absolute';
        renderArea.style.top = '0';
        renderArea.style.left = '0';
        renderArea.style.width = '1200px';
        renderArea.style.minWidth = '1200px';
        renderArea.style.maxWidth = '1200px';
        renderArea.style.background = '#fff';
        renderArea.style.zIndex = '9999';
        renderArea.style.padding = '20px';
        renderArea.style.fontFamily = 'Arial, sans-serif';
        renderArea.style.overflow = 'visible';
        renderArea.style.display = 'block';
        renderArea.style.visibility = 'visible';
        renderArea.style.pointerEvents = 'none';
        renderArea.style.opacity = '1';

        document.body.appendChild(renderArea);
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-UY', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('es-UY');

        const title = loanSet
            ? 'Reporte Filtrado de Préstamos'
            : filterType === 'pending'
                ? 'Reporte de Préstamos Pendientes'
                : 'Reporte Completo de Préstamos';

        // Construir filas de tabla
        let tableRows = '';
        loans.forEach(loan => {
            const checkoutSig = (loan.checkout_signature && loan.checkout_signature.startsWith('data:image'))
                ? `<img src="${loan.checkout_signature}" style="width:80px;height:40px;object-fit:contain;border:1px solid #ddd;border-radius:4px;background:#fafafa;">`
                : '-';

            const returnSig = (loan.return_signature && loan.return_signature.startsWith('data:image'))
                ? `<img src="${loan.return_signature}" style="width:80px;height:40px;object-fit:contain;border:1px solid #ddd;border-radius:4px;background:#fafafa;">`
                : '-';

            const statusText = loan.status === 'returned' ? 'Devuelto' : 'Pendiente';
            const statusColor = loan.status === 'returned' ? '#2ecc71' : '#e74c3c';

            tableRows += `
                <tr>
                    <td style="padding:6px;border-bottom:1px solid #eee;">#${loan.id}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;">${UI.formatDate(loan.checkout_time)}</td>
                            <td style="padding:6px;border-bottom:1px solid #eee;">${UI.escapeHTML(loan.ci)}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;">${UI.escapeHTML(loan.name)}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;">${UI.escapeHTML(loan.equipment_details)}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;">${checkoutSig}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;">${loan.status === 'returned' ? UI.formatDate(loan.return_time) : '-'}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;">${returnSig}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;">${UI.escapeHTML(loan.return_observation || '-')}</td>
                    <td style="padding:6px;border-bottom:1px solid #eee;color:${statusColor};font-weight:600;">${statusText}</td>
                </tr>
            `;
        });

        renderArea.innerHTML = `
            <div style="text-align:center;padding:20px 0;border-bottom:3px solid #00458a;margin-bottom:20px;">
                <h1 style="color:#00458a;font-size:1.5rem;margin:0;">ISBO — ${title}</h1>
                <p style="color:#666;font-size:0.85rem;margin:6px 0 0 0;">Generado el ${dateStr} a las ${timeStr}</p>
            </div>
            
            <table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
                <thead>
                    <tr>
                                <th style="width:60px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">ID</th>
                        <th style="width:180px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Retiro</th>
                        <th style="width:90px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">CI</th>
                        <th style="width:130px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Nombre</th>
                        <th style="width:170px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Equipamiento</th>
                        <th style="width:100px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Firma Retiro</th>
                        <th style="width:150px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Devolución</th>
                        <th style="width:100px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Firma Devolución</th>
                        <th style="width:160px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Observaciones</th>
                        <th style="width:60px;background:#002d5c;color:white;padding:8px 6px;text-align:left;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || '<tr><td colspan="10" style="padding:12px;text-align:center;color:#999;">Sin registros</td></tr>'}
                </tbody>
            </table>
            
            <div style="text-align:center;padding:15px 0;border-top:1px solid #eee;margin-top:20px;color:#666;font-size:0.8rem;">
                Instituto Superior Brazo Oriental (ISBO) — Sistema de Registro de Equipamiento — ${now.getFullYear()}
            </div>
        `;

        // Esperar a que las imágenes carguen
        const images = renderArea.querySelectorAll('img');
        if (images.length > 0) {
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
        }

        // Dar tiempo al browser para pintar el DOM antes de capturarlo
        await new Promise(r => setTimeout(r, 500));

        const renderWidth = renderArea.offsetWidth || 1200;
        const renderHeight = renderArea.scrollHeight || renderArea.offsetHeight || 1400;
        console.log('PDF render size', renderWidth, renderHeight);

        const opt = {
            margin: 6,
            filename: loanSet
                ? 'Reporte_Filtrado_ISBO.pdf'
                : filterType === 'pending'
                    ? 'Reporte_Pendientes_ISBO.pdf'
                    : 'Reporte_Completo_ISBO.pdf',
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                width: renderWidth,
                height: renderHeight,
                windowWidth: renderWidth,
                windowHeight: renderHeight,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        await html2pdf().set(opt).from(renderArea).save();

        // Limpiar
        renderArea.remove();

        UI.showToast('PDF exportado correctamente', 'success');
    } catch (e) {
        console.error('Error generando PDF:', e);
        UI.showToast('Error al generar el PDF', 'error');
    }
}

// Botones de exportar PDF
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    generatePDFReport('all');
});

document.getElementById('btn-pdf-full').addEventListener('click', () => {
    generatePDFReport('all');
});

document.getElementById('btn-pdf-pending').addEventListener('click', () => {
    generatePDFReport('pending');
});

// Comprobar sesión al cargar la vista de admin
const adminTabBtn = document.querySelector('.tab-btn.admin-btn');
if (adminTabBtn) {
    adminTabBtn.addEventListener('click', () => {
        loadAdminDashboard();
    });
}

// Inicializar reloj de Montevideo
UI.updateMontevideoClock();
setInterval(() => UI.updateMontevideoClock(), 1000);

// También enlazar el botón admin compacto del header
const adminIconBtn = document.querySelector('.admin-icon-btn');
if (adminIconBtn) {
    adminIconBtn.addEventListener('click', () => {
        UI.switchView('view-admin');
        try { loadAdminDashboard(); } catch (e) { console.warn('loadAdminDashboard no disponible', e); }
    });
}
