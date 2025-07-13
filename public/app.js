class TalkTracker {
    constructor() {
        this.currentUser = null;
        this.interactions = [];
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.bindEvents();
        this.setCurrentDateTime();
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Interaction form
        document.getElementById('interactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addInteraction();
        });

        // Interaction type selection
        document.querySelectorAll('#interactionTypesSelector .interaction-type').forEach(type => {
            type.addEventListener('click', () => {
                this.selectInteractionType(type);
            });
        });

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterInteractions();
        });

        document.getElementById('filterType').addEventListener('change', () => {
            this.filterInteractions();
        });

        document.getElementById('filterPerson').addEventListener('input', () => {
            this.filterInteractions();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Copy therapist link button
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            this.copyTherapistLink();
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                this.currentUser = data.user;
                this.showDashboard();
                this.loadInteractions();
                this.loadStats();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    async login() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.showDashboard();
                this.loadInteractions();
                this.loadStats();
            } else {
                this.showError(errorDiv, data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError(errorDiv, 'Login failed. Please try again.');
        }
    }

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    showLogin() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboard').classList.remove('active');
        document.getElementById('loginForm').reset();
        this.hideMessage(document.getElementById('loginError'));
    }

    showDashboard() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        document.getElementById('currentUser').textContent = this.currentUser.username;
        
        // Populate therapist access information
        if (this.currentUser.id) {
            const baseUrl = window.location.origin;
            const therapistLink = `${baseUrl}/therapist?userId=${this.currentUser.id}&token=therapist-view-token`;
            
            document.getElementById('therapistDirectLink').value = therapistLink;
            document.getElementById('clientIdDisplay').value = this.currentUser.id;
            document.getElementById('accessTokenDisplay').value = 'therapist-view-token';
        }
    }

    setCurrentDateTime() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        
        document.getElementById('interactionDate').value = dateStr;
        document.getElementById('interactionTime').value = timeStr;
    }

    selectInteractionType(typeElement) {
        // Remove previous selection
        document.querySelectorAll('#interactionTypesSelector .interaction-type').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to clicked element
        typeElement.classList.add('selected');
        document.getElementById('selectedInteractionType').value = typeElement.dataset.type;
    }

    async addInteraction() {
        const formData = {
            date: document.getElementById('interactionDate').value,
            time: document.getElementById('interactionTime').value,
            person: document.getElementById('interactionPerson').value,
            interaction_type: document.getElementById('selectedInteractionType').value,
            context: document.getElementById('interactionContext').value,
            response: document.getElementById('interactionResponse').value,
            reflection: document.getElementById('interactionReflection').value,
        };

        if (!formData.interaction_type) {
            this.showError(document.getElementById('dashboardError'), 'Please select an interaction type.');
            return;
        }

        try {
            const response = await fetch('/api/interactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(document.getElementById('dashboardSuccess'), 'Interaction added successfully!');
                this.resetInteractionForm();
                this.loadInteractions();
                this.loadStats();
            } else {
                this.showError(document.getElementById('dashboardError'), data.error || 'Failed to add interaction');
            }
        } catch (error) {
            console.error('Add interaction error:', error);
            this.showError(document.getElementById('dashboardError'), 'Failed to add interaction. Please try again.');
        }
    }

    resetInteractionForm() {
        document.getElementById('interactionForm').reset();
        document.querySelectorAll('#interactionTypesSelector .interaction-type').forEach(el => {
            el.classList.remove('selected');
        });
        document.getElementById('selectedInteractionType').value = '';
        this.setCurrentDateTime();
    }

    async loadInteractions() {
        try {
            const response = await fetch('/api/interactions');
            this.interactions = await response.json();
            this.renderInteractions();
        } catch (error) {
            console.error('Load interactions error:', error);
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            this.updateStats(stats);
        } catch (error) {
            console.error('Load stats error:', error);
        }
    }

    updateStats(stats) {
        document.getElementById('totalInteractions').textContent = stats.total || 0;
        
        // Calculate weekly count from recent activity
        const weeklyCount = stats.recentActivity ? 
            stats.recentActivity.reduce((sum, day) => sum + day.count, 0) : 0;
        document.getElementById('weeklyInteractions').textContent = weeklyCount;
        
        // Update type counts
        const typeCounts = {};
        if (stats.byType) {
            stats.byType.forEach(type => {
                typeCounts[type.interaction_type.toLowerCase()] = type.count;
            });
        }
        
        document.getElementById('discussionCount').textContent = typeCounts.discussion || 0;
        document.getElementById('disagreementCount').textContent = typeCounts.disagreement || 0;
        document.getElementById('debateCount').textContent = typeCounts.debate || 0;
        document.getElementById('confrontationCount').textContent = typeCounts.confrontation || 0;
    }

    renderInteractions(interactions = this.interactions) {
        const tbody = document.getElementById('interactionsTableBody');
        tbody.innerHTML = '';

        interactions.forEach(interaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${interaction.date}</td>
                <td>${interaction.time}</td>
                <td>${interaction.person}</td>
                <td><span class="type-badge type-${interaction.interaction_type.toLowerCase()}">${interaction.interaction_type}</span></td>
                <td title="${interaction.context}">${this.truncateText(interaction.context, 50)}</td>
                <td>
                    <button onclick="app.deleteInteraction(${interaction.id})" class="btn btn-secondary btn-small">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterInteractions() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const type = document.getElementById('filterType').value;
        const person = document.getElementById('filterPerson').value.toLowerCase();

        const filtered = this.interactions.filter(interaction => {
            const matchesSearch = !search || 
                interaction.person.toLowerCase().includes(search) ||
                interaction.context.toLowerCase().includes(search) ||
                interaction.response.toLowerCase().includes(search) ||
                interaction.reflection.toLowerCase().includes(search);
            
            const matchesType = !type || interaction.interaction_type === type;
            const matchesPerson = !person || interaction.person.toLowerCase().includes(person);

            return matchesSearch && matchesType && matchesPerson;
        });

        this.renderInteractions(filtered);
    }

    async deleteInteraction(id) {
        if (!confirm('Are you sure you want to delete this interaction?')) {
            return;
        }

        try {
            const response = await fetch(`/api/interactions/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(document.getElementById('dashboardSuccess'), 'Interaction deleted successfully!');
                this.loadInteractions();
                this.loadStats();
            } else {
                this.showError(document.getElementById('dashboardError'), data.error || 'Failed to delete interaction');
            }
        } catch (error) {
            console.error('Delete interaction error:', error);
            this.showError(document.getElementById('dashboardError'), 'Failed to delete interaction. Please try again.');
        }
    }

    exportToCSV() {
        if (this.interactions.length === 0) {
            alert('No interactions to export');
            return;
        }

        const headers = ['Date', 'Time', 'Person', 'Type', 'Context', 'Response', 'Reflection'];
        const csvContent = [
            headers.join(','),
            ...this.interactions.map(interaction => [
                interaction.date,
                interaction.time,
                `"${interaction.person}"`,
                `"${interaction.interaction_type}"`,
                `"${interaction.context.replace(/"/g, '""')}"`,
                `"${interaction.response.replace(/"/g, '""')}"`,
                `"${interaction.reflection.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `talk-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    truncateText(text, length) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    showError(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
        setTimeout(() => {
            this.hideMessage(element);
        }, 5000);
    }

    showSuccess(element, message) {
        element.textContent = message;
        element.classList.remove('hidden');
        setTimeout(() => {
            this.hideMessage(element);
        }, 3000);
    }

    hideMessage(element) {
        element.classList.add('hidden');
    }

    copyTherapistLink() {
        const linkInput = document.getElementById('therapistDirectLink');
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            document.execCommand('copy');
            this.showSuccess(document.getElementById('dashboardSuccess'), 'Therapist link copied to clipboard!');
        } catch (err) {
            // Fallback: show the link in an alert
            alert('Copy failed. Here is the therapist link:\n\n' + linkInput.value);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TalkTracker();
});