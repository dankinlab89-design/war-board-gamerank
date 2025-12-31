// ranking.js - Funcionalidades específicas da página de ranking
class RankingPage {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.loadAllRankings();
        this.setupEventListeners();
    }

    async loadAllRankings() {
        try {
            await Promise.all([
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance()
            ]);
        } catch (error) {
            console.error('Erro ao carregar rankings:', error);
        }
    }

    async loadRankingGlobal() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/global`);
            const ranking = await response.json();
            
            this.renderRankingGlobal(ranking);
        } catch (error) {
            console.error('Erro ao carregar ranking global:', error);
        }
    }

    async loadRankingMensal() {
        try {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = hoje.getMonth() + 1;
            
            const response = await fetch(`${this.apiBase}/ranking/mensal/${ano}/${mes}`);
            const ranking = await response.json();
            
            this.renderRankingMensal(ranking);
        } catch (error) {
            console.error('Erro ao carregar ranking mensal:', error);
        }
    }

    async loadRankingPerformance() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/performance`);
            const ranking = await response.json();
            
            this.renderRankingPerformance(ranking);
        } catch (error) {
            console.error('Erro ao carregar ranking performance:', error);
        }
    }

    renderRankingGlobal(ranking) {
        const tbody = document.querySelector('#ranking-global tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = this.createEmptyRow(6);
            return;
        }
        
        ranking.forEach((jogador, index) => {
            const percentual = jogador.partidas > 0 ? 
                ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="rank-position ${index < 3 ? `rank-${index + 1}` : ''}">
                        ${index + 1}
                    </div>
                </td>
                <td><strong>${jogador.apelido}</strong></td>
                <td>
                    <span class="patente-badge ${this.getPatenteClass(jogador.patente)}">
                        ${jogador.patente}
                    </span>
                </td>
                <td style="color: #10b981; font-weight: bold;">${jogador.vitorias || 0}</td>
                <td>${jogador.partidas || 0}</td>
                <td>
                    <div class="performance-bar-container">
                        <div class="performance-bar-fill" style="width: ${percentual > 100 ? 100 : percentual}%"></div>
                        <span class="performance-bar-text">${percentual}%</span>
                    </div>
                </td>
                <td>${(jogador.vitorias * 10) + (jogador.partidas * 2)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // ... (implementar métodos similares para mensal e performance)

    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.switchTab(tabName);
            });
        });

        // Botões de exportação
        document.getElementById('export-ranking-global')?.addEventListener('click', () => this.exportRanking('global'));
        document.getElementById('export-ranking-mensal')?.addEventListener('click', () => this.exportRanking('mensal'));
        document.getElementById('export-ranking-performance')?.addEventListener('click', () => this.exportRanking('performance'));
    }

    switchTab(tabName) {
        // Remover active de todas
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Adicionar active na selecionada
        document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    }

    // ... (outros métodos auxiliares)
}

// Inicializar
if (document.querySelector('#ranking-global')) {
    new RankingPage();
}
