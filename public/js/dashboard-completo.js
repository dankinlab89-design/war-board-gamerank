// dashboard-completo.js
class DashboardCompleto {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.loadAllData();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadAllData() {
        try {
            await Promise.all([
                this.loadEstatisticas(),
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance(),
                this.loadVencedoresMensais(new Date().getFullYear()),
                this.loadAssiduidade(),
                this.loadUltimasPartidas()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }

    async loadEstatisticas() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas`);
            const stats = await response.json();
            
            document.getElementById('stat-jogadores').textContent = stats.total_jogadores || 0;
            document.getElementById('stat-partidas').textContent = stats.total_partidas || 0;
            document.getElementById('stat-record').textContent = stats.record_vitorias || 0;
            
            // Carregar record holder
            const ranking = await this.loadRankingGlobalData();
            if (ranking.length > 0) {
                document.getElementById('record-holder').textContent = ranking[0].apelido;
            }
            
        } catch (error) {
            console.error('Erro estatísticas:', error);
        }
    }

    async loadRankingGlobal() {
        try {
            const ranking = await this.loadRankingGlobalData();
            this.renderRanking(ranking, 'ranking-global');
        } catch (error) {
            console.error('Erro ranking global:', error);
        }
    }

    async loadRankingMensal() {
        try {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = hoje.getMonth() + 1;
            
            const response = await fetch(`${this.apiBase}/ranking/mensal/${ano}/${mes}`);
            const ranking = await response.json();
            
            const tbody = document.querySelector('#ranking-mensal tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (ranking.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            Nenhuma partida este mês
                        </td>
                    </tr>
                `;
                return;
            }
            
            ranking.forEach((jogador, index) => {
                const percentual = jogador.partidas > 0 ? 
                    ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${jogador.apelido}</strong></td>
                    <td><span class="patente-badge ${this.getPatenteClass(jogador.patente)}">${jogador.patente}</span></td>
                    <td class="text-success fw-bold">${jogador.vitorias}</td>
                    <td>${jogador.partidas}</td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-warning" style="width: ${percentual > 100 ? 100 : percentual}%">
                                ${percentual}%
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Erro ranking mensal:', error);
        }
    }

    async loadRankingPerformance() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/performance`);
            const ranking = await response.json();
            
            const tbody = document.querySelector('#ranking-performance tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (ranking.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-4">
                            Mínimo 3 partidas para performance
                        </td>
                    </tr>
                `;
                return;
            }
            
            ranking.forEach((jogador, index) => {
                const nivel = this.getNivelPerformance(jogador.percentual);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${jogador.apelido}</strong></td>
                    <td><span class="patente-badge ${this.getPatenteClass(jogador.patente)}">${jogador.patente}</span></td>
                    <td class="text-success fw-bold">${jogador.vitorias}</td>
                    <td>${jogador.partidas}</td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar ${this.getProgressBarClass(jogador.percentual)}" 
                                 style="width: ${jogador.percentual > 100 ? 100 : jogador.percentual}%">
                                ${jogador.percentual}%
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${this.getNivelBadgeClass(nivel)}">${nivel}</span></td>
                `;
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Erro ranking performance:', error);
        }
    }

    async loadAssiduidade() {
        try {
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            
            // Buscar partidas de cada jogador
            const assiduidade = await Promise.all(
                jogadores.map(async jogador => {
                    const response = await fetch(`${this.apiBase}/partidas`);
                    const partidas = await response.json();
                    
                    const partidasJogador = partidas.filter(p => 
                        p.participantes.includes(jogador.id.toString())
                    ).length;
                    
                    return {
                        apelido: jogador.apelido,
                        partidas: partidasJogador,
                        patente: jogador.patente
                    };
                })
            );
            
            assiduidade.sort((a, b) => b.partidas - a.partidas);
            
            // Atualizar gráfico
            this.updateChartAssiduidade(assiduidade.slice(0, 8));
            
        } catch (error) {
            console.error('Erro assiduidade:', error);
        }
    }

    updateChartAssiduidade(data) {
        const ctx = document.getElementById('chart-assiduidade');
        if (!ctx) return;
        
        const chart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.map(d => d.apelido),
                datasets: [{
                    label: 'Partidas Jogadas',
                    data: data.map(d => d.partidas),
                    backgroundColor: 'rgba(184, 134, 11, 0.8)',
                    borderColor: 'rgba(184, 134, 11, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(255,255,255,0.7)' }
                    },
                    x: {
                        ticks: { color: 'rgba(255,255,255,0.7)' }
                    }
                }
            }
        });
    }

    async loadVencedoresMensais(ano) {
        try {
            const response = await fetch(`${this.apiBase}/vencedores-mensais/${ano}`);
            const vencedores = await response.json();
            
            const grid = document.getElementById('vencedores-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            
            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            
            meses.forEach((mesNome, index) => {
                const mesNum = index + 1;
                const vencedor = vencedores[mesNum];
                
                const card = document.createElement('div');
                card.className = 'vencedor-mes-card';
                
                if (vencedor) {
                    card.innerHTML = `
                        <div class="card-header">
                            <h4>${mesNome.toUpperCase()}</h4>
                            <span class="badge bg-warning">🏆</span>
                        </div>
                        <div class="card-body">
                            <div class="vencedor-nome">${vencedor.vencedor}</div>
                            <div class="vencedor-info">
                                <span class="vitorias">${vencedor.vitorias} vitórias</span>
                                <span class="patente-badge ${this.getPatenteClass(vencedor.patente)}">
                                    ${vencedor.patente}
                                </span>
                            </div>
                        </div>
                    `;
                } else {
                    card.innerHTML = `
                        <div class="card-header">
                            <h4>${mesNome.toUpperCase()}</h4>
                            <span class="badge bg-secondary">-</span>
                        </div>
                        <div class="card-body">
                            <div class="sem-vencedor">Sem dados</div>
                        </div>
                    `;
                }
                
                grid.appendChild(card);
            });
            
        } catch (error) {
            console.error('Erro vencedores mensais:', error);
        }
    }

    // ... (outros métodos auxiliares)
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new DashboardCompleto();
});
