// assets/js/api.js

const API_BASE = 'api/';

const API = {
    async request(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin' // This is required for PHP sessions (cookies) to work
        };
        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(API_BASE + endpoint, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error en la petición');
            }
            if (result.error) {
                throw new Error(result.error);
            }
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // --- Préstamos (Público) ---
    async createLoan(loanData) {
        return this.request('loans.php', 'POST', loanData);
    },

    async getActiveLoansByCI(ci) {
        return this.request(`loans.php?action=active_by_ci&ci=${encodeURIComponent(ci)}`);
    },

    async returnLoan(returnId, signatureBase64, observation = '') {
        return this.request('loans.php', 'PUT', {
            id: returnId,
            return_signature: signatureBase64,
            return_observation: observation
        });
    },

    async updateLoanStatus(id, status, observation = '') {
        return this.request('loans.php', 'PUT', {
            id,
            status,
            return_observation: observation
        });
    },

    // --- Administrador ---
    async login(username, password) {
        return this.request('auth.php?action=login', 'POST', { username, password });
    },

    async checkAuth() {
        return this.request('auth.php?action=check');
    },

    async logout() {
        return this.request('auth.php?action=logout', 'POST');
    },

    async getPendingLoans() {
        return this.request('loans.php?action=pending');
    },

    async getStats() {
        return this.request('loans.php?action=stats');
    },

    async getAllLoans() {
        return this.request('loans.php?action=all');
    }
};
