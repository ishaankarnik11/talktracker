class TherapistDashboard {
    constructor() {
        this.clientId = null;
        this.accessToken = null;
        this.allInteractions = [];
        this.filteredInteractions = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkUrlParams();
    }

    bindEvents() {
        document.getElementById('accessForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.accessDashboard();
        });

        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportReport();
        });
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const token = urlParams.get('token');

        if (userId && token) {
            document.getElementById('clientId').value = userId;
            document.getElementById('accessToken').value = token;
            this.accessDashboard();
        }
    }

    async accessDashboard() {
        console.log('accessDashboard called'); // Debug log
        this.clientId = document.getElementById('clientId').value;
        this.accessToken = document.getElementById('accessToken').value;
        const errorDiv = document.getElementById('accessError');

        console.log('Client ID:', this.clientId, 'Token:', this.accessToken); // Debug log

        if (!this.clientId || !this.accessToken) {
            this.showError(errorDiv, 'Please enter both Client ID and Access Token');
            return;
        }

        this.showLoading(true);

        try {
            const url = `/api/therapist/interactions/${this.clientId}?token=${this.accessToken}`;
            console.log('Fetching URL:', url); // Debug log
            
            const response = await fetch(url);
            console.log('Response status:', response.status); // Debug log
            
            if (response.ok) {
                this.allInteractions = await response.json();
                console.log('Loaded interactions:', this.allInteractions.length); // Debug log
                this.filteredInteractions = [...this.allInteractions];
                this.showDashboard();
                this.updateStatistics();
                this.generateInsights();
                this.renderInteractions();
            } else {
                const error = await response.json();
                console.error('Error response:', error); // Debug log
                this.showError(errorDiv, error.error || 'Access denied. Please check your credentials.');
            }
        } catch (error) {
            console.error('Access error:', error);
            this.showError(errorDiv, 'Failed to access dashboard. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showDashboard() {
        console.log('Showing dashboard'); // Debug log
        document.getElementById('accessPanel').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
    }

    updateStatistics() {
        const stats = this.calculateStatistics(this.filteredInteractions);
        
        document.getElementById('totalInteractions').textContent = stats.total;
        document.getElementById('discussionCount').textContent = stats.discussion;
        document.getElementById('disagreementCount').textContent = stats.disagreement;
        document.getElementById('debateCount').textContent = stats.debate;
        document.getElementById('confrontationCount').textContent = stats.confrontation;
    }

    calculateStatistics(interactions) {
        const stats = {
            total: interactions.length,
            discussion: 0,
            disagreement: 0,
            debate: 0,
            confrontation: 0
        };

        interactions.forEach(interaction => {
            const type = interaction.interaction_type.toLowerCase();
            if (stats.hasOwnProperty(type)) {
                stats[type]++;
            }
        });

        return stats;
    }

    generateInsights() {
        const interactions = this.filteredInteractions;
        
        // Distribution insight
        const stats = this.calculateStatistics(interactions);
        const total = stats.total;
        if (total > 0) {
            const distributionText = `
                Discussions: ${((stats.discussion / total) * 100).toFixed(1)}%, 
                Disagreements: ${((stats.disagreement / total) * 100).toFixed(1)}%, 
                Debates: ${((stats.debate / total) * 100).toFixed(1)}%, 
                Confrontations: ${((stats.confrontation / total) * 100).toFixed(1)}%
            `;
            document.getElementById('distributionInsight').textContent = distributionText;
        }

        // Partners insight
        const partners = {};
        interactions.forEach(interaction => {
            partners[interaction.person] = (partners[interaction.person] || 0) + 1;
        });
        const topPartners = Object.entries(partners)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([person, count]) => `${person} (${count})`)
            .join(', ');
        document.getElementById('partnersInsight').textContent = 
            topPartners || 'No interaction partners identified';

        // Escalation patterns
        let escalationPattern = '';
        const confrontations = interactions.filter(i => i.interaction_type === 'Confrontation');
        if (confrontations.length > 0) {
            const confrontationRate = ((confrontations.length / total) * 100).toFixed(1);
            escalationPattern = `${confrontationRate}% of interactions escalated to confrontation. `;
            
            const confrontationPartners = {};
            confrontations.forEach(interaction => {
                confrontationPartners[interaction.person] = (confrontationPartners[interaction.person] || 0) + 1;
            });
            const topConfrontationPartner = Object.entries(confrontationPartners)
                .sort(([,a], [,b]) => b - a)[0];
            if (topConfrontationPartner) {
                escalationPattern += `Most confrontations with: ${topConfrontationPartner[0]}`;
            }
        } else {
            escalationPattern = 'No confrontational interactions recorded - positive communication pattern';
        }
        document.getElementById('escalationInsight').textContent = escalationPattern;

        // Reflection quality
        const withReflections = interactions.filter(i => i.reflection && i.reflection.trim().length > 0);
        const reflectionRate = total > 0 ? ((withReflections.length / total) * 100).toFixed(1) : 0;
        const avgReflectionLength = withReflections.length > 0 ? 
            Math.round(withReflections.reduce((sum, i) => sum + i.reflection.length, 0) / withReflections.length) : 0;
        
        document.getElementById('reflectionInsight').textContent = 
            `${reflectionRate}% of interactions include reflections. Average reflection length: ${avgReflectionLength} characters.`;
    }

    applyFilters() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const type = document.getElementById('filterType').value;
        const person = document.getElementById('filterPerson').value.toLowerCase();
        const keyword = document.getElementById('searchKeyword').value.toLowerCase();

        this.filteredInteractions = this.allInteractions.filter(interaction => {
            // Date filter
            if (startDate && interaction.date < startDate) return false;
            if (endDate && interaction.date > endDate) return false;
            
            // Type filter
            if (type && interaction.interaction_type !== type) return false;
            
            // Person filter
            if (person && !interaction.person.toLowerCase().includes(person)) return false;
            
            // Keyword search
            if (keyword) {
                const searchableText = [
                    interaction.context || '',
                    interaction.response || '',
                    interaction.reflection || ''
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(keyword)) return false;
            }

            return true;
        });

        this.updateStatistics();
        this.generateInsights();
        this.renderInteractions();
    }

    clearFilters() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterPerson').value = '';
        document.getElementById('searchKeyword').value = '';
        
        this.filteredInteractions = [...this.allInteractions];
        this.updateStatistics();
        this.generateInsights();
        this.renderInteractions();
    }

    renderInteractions() {
        const tbody = document.getElementById('interactionsTableBody');
        tbody.innerHTML = '';

        this.filteredInteractions.forEach(interaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${interaction.date}</td>
                <td>${interaction.time}</td>
                <td>${interaction.person}</td>
                <td><span class="type-badge type-${interaction.interaction_type.toLowerCase()}">${interaction.interaction_type}</span></td>
                <td title="${interaction.context || ''}">${this.truncateText(interaction.context, 50)}</td>
                <td title="${interaction.response || ''}">${this.truncateText(interaction.response, 50)}</td>
                <td title="${interaction.reflection || ''}">${this.truncateText(interaction.reflection, 50)}</td>
            `;
            tbody.appendChild(row);
        });

        if (this.filteredInteractions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; color: var(--gray-600);">No interactions found matching the current filters</td>';
            tbody.appendChild(row);
        }
    }

    exportReport() {
        if (this.filteredInteractions.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = [
            'Date', 'Time', 'Person', 'Type', 'Context', 'Response', 'Reflection'
        ];
        
        const csvContent = [
            headers.join(','),
            ...this.filteredInteractions.map(interaction => [
                interaction.date,
                interaction.time,
                `"${interaction.person}"`,
                `"${interaction.interaction_type}"`,
                `"${(interaction.context || '').replace(/"/g, '""')}"`,
                `"${(interaction.response || '').replace(/"/g, '""')}"`,
                `"${(interaction.reflection || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `therapist-report-client-${this.clientId}-${new Date().toISOString().split('T')[0]}.csv`;
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
        console.log('Showing error:', message); // Debug log
        element.textContent = message;
        element.classList.remove('hidden');
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loadingMessage');
        if (show) {
            loadingEl.classList.remove('hidden');
        } else {
            loadingEl.classList.add('hidden');
        }
    }
}

// Initialize the therapist dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing therapist dashboard'); // Debug log
    window.therapistApp = new TherapistDashboard();
});