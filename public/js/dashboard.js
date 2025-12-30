// Dashboard WAR Board GameRank
class Dashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentYear = new Date().getFullYear();
        this.charts = {};
        
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
                this.loadUltimasPartidas(),
                this.loadVencedoresMensais(this.currentYear)
            ]);
            
            this.updateCharts();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    async loadEstatisticas() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas`);
            const data = await response.json();
            
            // Atualizar estatísticas rápidas
            document.getElementById('stat-jogadores').textContent = data.total_jogadores || 0;
            document.getElementById('stat-partidas').textContent = data.total_partidas || 0;
            document.getElementById('stat-record').textContent = data.record_vitorias || 0;
            document.getElementById('record-holder').textContent = data.record_holder || '-';
            
            // Calcular média
            const media = data.total_jogadores > 0 ? 
                (data.total_partidas / data.total_jogadores).toFixed(1) : 0;
            document.getElementById('stat-media').textContent = media;
            
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async loadRankingGlobal() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/global`);
            const ranking = await response.json();
            
            const tbody = document.querySelector('#ranking-global tbody');
            tbody.innerHTML = '';
            
            ranking.forEach((jogador, index) => {
                const percentual = jogador.partidas > 0 ? 
                    ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0;
                const pontos = (jogador.vitorias * 10) + (jogador.partidas * 2);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${jogador.apelido}</strong></td>
                    <td><span class="patente-badge ${this.getPatenteClass(jogador.patente)}">${jogador.patente}</span></td>
                    <td style="color: #10b981; font-weight: bold;">${jogador.vitorias}</td>
                    <td>${jogador.partidas}</td>
                    <td>
                        <span class="percent-badge ${this.getPercentClass(percentual)}">
                            ${percentual}%
                        </span>
                    </td>
                    <td style="font-weight: bold; color: #8b5cf6;">${pontos}</td>
                `;
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Erro ao carregar ranking global:', error);
        }
    }

    async loadRankingMensal() {
        try {
            const mesAtual = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`;
            const response = await fetch(`${this.apiBase}/ranking/mensal/${mesAtual}`);
            const ranking = await response.json();
            
            const tbody = document.querySelector('#ranking-mensal tbody');
            tbody.innerHTML = '';
            
            if (ranking.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
                            Nenhuma partida registrada este mês
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
                    <td style="color: #10b981; font-weight: bold;">${jogador.vitorias}</td>
                    <td>${jogador.partidas}</td>
                    <td>
                        <span class="percent-badge ${this.getPercentClass(percentual)}">
                            ${percentual}%
                        </span>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Erro ao carregar ranking mensal:', error);
        }
    }

    async loadUltimasPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const partidas = await response.json();
            
            const tbody = document.querySelector('#ultimas-partidas tbody');
            tbody.innerHTML = '';
            
            partidas.slice(0, 10).forEach(partida => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(partida.data).toLocaleDateString('pt-BR')}</td>
                    <td><strong style="color: #10b981;">${partida.vencedor_nome}</strong></td>
                    <td><span class="badge ${partida.tipo === 'campeonato' ? 'badge-warning' : 'badge-info'}">${partida.tipo}</span></td>
                    <td>${partida.participantes.split(',').length}</td>
                    <td style="font-size: 0.9rem; color: #6b7280;">${partida.observacoes || '-'}</td>
                `;
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Erro ao carregar últimas partidas:', error);
        }
    }

    async loadVencedoresMensais(ano) {
        try {
            const response = await fetch(`${this.apiBase}/vencedores/${ano}`);
            const vencedores = await response.json();
            
            const grid = document.getElementById('vencedores-grid');
            grid.innerHTML = '';
            
            const meses = [
                'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
            ];
            
            meses.forEach((mes, index) => {
                const mesAno = `${(index + 1).toString().padStart(2, '0')}/${ano}`;
                const vencedor = vencedores.find(v => v.mes_ano === mesAno);
                
                const card = document.createElement('div');
                card.className = 'mes-card';
                
                if (vencedor) {
                    card.innerHTML = `
                        <div class="mes-header">
                            <h4>${mes.toUpperCase()}</h4>
                            <span class="mes-badge vencedor">🏆</span>
                        </div>
                        <div class="mes-content">
                            <div class="vencedor-nome">${vencedor.vencedor}</div>
                            <div class="vencedor-stats">
                                <span class="vitorias">${vencedor.vitorias} vitórias</span>
                                <span class="patente ${this.getPatenteClass(vencedor.patente)}">${vencedor.patente}</span>
                            </div>
                        </div>
                    `;
                } else {
                    card.innerHTML = `
                        <div class="mes-header">
                            <h4>${mes.toUpperCase()}</h4>
                            <span class="mes-badge sem-dados">-</span>
                        </div>
                        <div class="mes-content">
                            <div class="sem-vencedor">Sem dados</div>
                        </div>
                    `;
                }
                
                grid.appendChild(card);
            });
            
        } catch (error) {
            console.error('Erro ao carregar vencedores mensais:', error);
        }
    }

    updateCharts() {
        // Gráfico de Patentes
        this.createPatentesChart();
        // Gráfico de Assiduidade
        this.createAssiduidadeChart();
    }

    createPatentesChart() {
        const ctx = document.getElementById('chart-patentes').getContext('2d');
        
        if (this.charts.patentes) {
            this.charts.patentes.destroy();
        }
        
        // Dados de exemplo - na implementação real buscar do backend
        const patentesData = {
            labels: ['Cabo 🪖', 'Soldado 🛡️', 'Tenente ⚔️', 'Capitão 👮', 'Major 💪', 'Coronel 🎖️', 'General ⭐', 'Marechal 🏆'],
            datasets: [{
                data: [5, 3, 2, 1, 1, 0, 0, 0],
                backgroundColor: [
                    '#6c757d', '#28a745', '#007bff', '#6610f2',
                    '#e83e8c', '#fd7e14', '#ffc107', '#ffd700'
                ],
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.2)'
            }]
        };
        
        this.charts.patentes = new Chart(ctx, {
            type: 'pie',
            data: patentesData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.9)',
                            font: {
                                family: 'Montserrat'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw} jogadores`;
                            }
                        }
                    }
                }
            }
        });
    }

    createAssiduidadeChart() {
        const ctx = document.getElementById('chart-assiduidade').getContext('2d');
        
        if (this.charts.assiduidade) {
            this.charts.assiduidade.destroy();
        }
        
        // Dados de exemplo
        const assiduidadeData = {
            labels: ['Silva', 'Santos', 'Costa', 'Lima', 'Souza', 'Pereira', 'Almeida', 'Rocha'],
            datasets: [{
                label: 'Partidas Jogadas',
                data: [25, 18, 12, 8, 5, 3, 2, 1],
                backgroundColor: 'rgba(184, 134, 11, 0.8)',
                borderColor: 'rgba(184, 134, 11, 1)',
                borderWidth: 2,
                borderRadius: 5
            }]
        };
        
        this.charts.assiduidade = new Chart(ctx, {
            type: 'bar',
            data: assiduidadeData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.9)'
                        }
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Select de ano para vencedores mensais
        document.getElementById('select-ano').addEventListener('change', (e) => {
            this.loadVencedoresMensais(e.target.value);
        });
    }

    startAutoRefresh() {
        // Atualizar dados a cada 30 segundos
        setInterval(() => {
            this.loadEstatisticas();
            this.loadUltimasPartidas();
        }, 30000);
    }

    getPatenteClass(patente) {
        if (patente.includes('Marechal')) return 'patente-marechal';
        if (patente.includes('General')) return 'patente-general';
        if (patente.includes('Coronel')) return 'patente-coronel';
        if (patente.includes('Major')) return 'patente-major';
        if (patente.includes('Capitão')) return 'patente-capitao';
        if (patente.includes('Tenente')) return 'patente-tenente';
        if (patente.includes('Soldado')) return 'patente-soldado';
        return 'patente-cabo';
    }

    getPercentClass(percent) {
        if (percent >= 50) return 'percent-high';
        if (percent >= 30) return 'percent-medium';
        return 'percent-low';
    }

    showError(message) {
        // Implementar notificação de erro
        console.error(message);
    }
}

// Inicializar dashboard quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});