// public/js/dashboard-mongodb.js
class DashboardMongoDB {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.currentYear = new Date().getFullYear();
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando Dashboard MongoDB...');
        await this.loadAllData();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.updateTimestamp();
    }

    async loadAllData() {
        try {
            console.log('🔄 Carregando dados do MongoDB...');
            
            await Promise.all([
                this.loadEstatisticasDashboard(),
                this.loadPodios(),
                this.loadVencedoresMensais(),
                this.loadUltimasPartidas()
            ]);
            
            await this.loadChartData();
            
            console.log('✅ Todos os dados carregados do MongoDB');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    // ============ CARREGAR ESTATÍSTICAS ============
    async loadEstatisticasDashboard() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/dashboard`);
            const data = await response.json();
            
            if (data.success) {
                const stats = data.estatisticas;
                
                // Total de jogadores
                document.getElementById('stat-jogadores').textContent = stats.total_jogadores;
                document.getElementById('trend-jogadores').textContent = '100% ativos';
                
                // Total de partidas
                document.getElementById('stat-partidas').textContent = stats.total_partidas;
                document.getElementById('trend-partidas').textContent = `${stats.percentual_mes}% este mês`;
                
                // Recorde consecutivo
                document.getElementById('stat-record').textContent = stats.record_consecutivo;
                document.getElementById('record-holder').textContent = stats.record_holder_consecutivo;
                
                // Média de vitórias
                document.getElementById('stat-media').textContent = stats.media_vitorias;
            }
            
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // ============ CARREGAR PÓDIOS ============
    async loadPodios() {
        await Promise.all([
            this.loadPodioGlobal(),
            this.loadPodioMensal(),
            this.loadPodioPerformance()
        ]);
    }

    async loadPodioGlobal() {
        try {
            const response = await fetch(`${this.apiBase}/podios/global`);
            const data = await response.json();
            
            if (data.success) {
                this.renderizarPodio(data.podio, 'podium-global');
            }
            
        } catch (error) {
            console.error('Erro ao carregar pódio global:', error);
        }
    }

    async loadPodioMensal() {
        try {
            const response = await fetch(`${this.apiBase}/podios/mensal`);
            const data = await response.json();
            
            const container = document.getElementById('podium-mensal');
            
            if (data.success && data.podio.length > 0) {
                this.renderizarPodio(data.podio, 'podium-mensal');
            } else {
                container.innerHTML = `
                    <div class="no-data-message">
                        Nenhuma partida este mês
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Erro ao carregar pódio mensal:', error);
        }
    }

    async loadPodioPerformance() {
        try {
            const response = await fetch(`${this.apiBase}/podios/performance`);
            const data = await response.json();
            
            const container = document.getElementById('podium-performance');
            
            if (data.success && data.podio.length > 0) {
                this.renderizarPodioPerformance(data.podio);
            } else {
                container.innerHTML = `
                    <div class="no-data-message">
                        Mínimo 3 partidas para calcular performance
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Erro ao carregar pódio performance:', error);
        }
    }

    renderizarPodio(podio, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Garantir 3 posições
        const podioCompleto = [
            podio[0] || null,
            podio[1] || null,
            podio[2] || null
        ];
        
        container.innerHTML = `
            <div class="podium-dashboard">
                <div class="podium-item silver">
                    <div class="podium-rank">🥈</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[1]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[1]?.vitorias || 0}</span> vitórias
                        </div>
                        <div class="player-patente">
                            ${podioCompleto[1]?.patente || 'Cabo 🪖'}
                        </div>
                    </div>
                </div>
                
                <div class="podium-item gold">
                    <div class="podium-rank">🥇</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[0]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[0]?.vitorias || 0}</span> vitórias
                        </div>
                        <div class="player-patente">
                            ${podioCompleto[0]?.patente || 'Cabo 🪖'}
                        </div>
                    </div>
                </div>
                
                <div class="podium-item bronze">
                    <div class="podium-rank">🥉</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[2]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[2]?.vitorias || 0}</span> vitórias
                        </div>
                        <div class="player-patente">
                            ${podioCompleto[2]?.patente || 'Cabo 🪖'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderizarPodioPerformance(podio) {
        const container = document.getElementById('podium-performance');
        if (!container) return;
        
        const podioCompleto = [
            podio[0] || null,
            podio[1] || null,
            podio[2] || null
        ];
        
        container.innerHTML = `
            <div class="podium-dashboard">
                <div class="podium-item silver">
                    <div class="podium-rank">🥈</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[1]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[1]?.performance || 0}%</span> performance
                        </div>
                        <div class="player-patente">
                            ${podioCompleto[1]?.patente || 'Cabo 🪖'}
                        </div>
                    </div>
                </div>
                
                <div class="podium-item gold">
                    <div class="podium-rank">🥇</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[0]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[0]?.performance || 0}%</span> performance
                        </div>
                        <div class="player-patente">
                            ${podioCompleto[0]?.patente || 'Cabo 🪖'}
                        </div>
                    </div>
                </div>
                
                <div class="podium-item bronze">
                    <div class="podium-rank">🥉</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[2]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[2]?.performance || 0}%</span> performance
                        </div>
                        <div class="player-patente">
                            ${podioCompleto[2]?.patente || 'Cabo 🪖'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============ VENCEDORES MENSAIS ============
    async loadVencedoresMensais() {
        try {
            const anoSelecionado = document.getElementById('select-ano')?.value || this.currentYear;
            const response = await fetch(`${this.apiBase}/vencedores/mensal/${anoSelecionado}`);
            const data = await response.json();
            
            if (data.success) {
                if (data.tipo === 'ranking_anual') {
                    this.renderizarRankingAnual2025(data.vencedores);
                } else {
                    this.renderizarVencedoresMensais(data.vencedores, anoSelecionado);
                }
            }
            
        } catch (error) {
            console.error('Erro ao carregar vencedores mensais:', error);
        }
    }

    renderizarRankingAnual2025(vencedores) {
        const grid = document.getElementById('vencedores-grid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="ranking-anual-2025">
                <div class="ano-card">
                    <div class="ano-header">
                        <h4>🏆 2025 - PRIMEIRO ANO 🏆</h4>
                    </div>
                    <div class="ano-content">
                        ${this.criarHTMLRanking2025(vencedores)}
                    </div>
                </div>
            </div>
        `;
    }

    criarHTMLRanking2025(vencedores) {
        const grupos = {};
        
        vencedores.forEach(v => {
            if (!grupos[v.posicao]) grupos[v.posicao] = [];
            grupos[v.posicao].push(v);
        });
        
        let html = '';
        
        // 1º lugar
        if (grupos[1]) {
            html += `
                <div class="ranking-item gold">
                    <span class="rank">🥇</span>
                    <span class="nome">${grupos[1][0].apelido}</span>
                    <span class="vitorias">${grupos[1][0].vitorias} vitórias</span>
                </div>
            `;
        }
        
        // 2º lugar (pode ter empate)
        if (grupos[2]) {
            html += `
                <div class="ranking-item silver">
                    <span class="rank">🥈</span>
                    <div class="empate-container">
                        ${grupos[2].map(j => `
                            <div class="empate">
                                <span class="nome">${j.apelido}</span>
                                <span class="vitorias">${j.vitorias} vitórias</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // 3º lugar
        if (grupos[3]) {
            html += `
                <div class="ranking-item bronze">
                    <span class="rank">🥉</span>
                    <span class="nome">${grupos[3][0].apelido}</span>
                    <span class="vitorias">${grupos[3][0].vitorias} vitórias</span>
                </div>
            `;
        }
        
        return html;
    }

    renderizarVencedoresMensais(vencedores, ano) {
        const grid = document.getElementById('vencedores-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        meses.forEach((mes, index) => {
            const mesNumero = index + 1;
            const vencedorMes = Array.isArray(vencedores) ? 
                vencedores.find(v => v.mes === mesNumero) : null;
            
            const card = document.createElement('div');
            card.className = 'mes-card';
            
            if (vencedorMes) {
                card.innerHTML = `
                    <div class="mes-header">
                        <h4>${mes.toUpperCase()}</h4>
                        <span class="mes-badge vencedor">🏆</span>
                    </div>
                    <div class="mes-content">
                        <div class="vencedor-nome">${vencedorMes.jogador_apelido}</div>
                        <div class="vencedor-stats">
                            <div class="vitorias">${vencedorMes.vitorias} vitórias</div>
                            <div class="participacoes">${vencedorMes.partidas} partidas</div>
                            <div class="patente">${vencedorMes.patente}</div>
                        </div>
                    </div>
                `;
            } else if (ano < this.currentYear || 
                      (ano === this.currentYear && mesNumero <= new Date().getMonth() + 1)) {
                card.innerHTML = `
                    <div class="mes-header">
                        <h4>${mes.toUpperCase()}</h4>
                        <span class="mes-badge sem-dados">?</span>
                    </div>
                    <div class="mes-content">
                        <div class="sem-vencedor">Dados não registrados</div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="mes-header">
                        <h4>${mes.toUpperCase()}</h4>
                        <span class="mes-badge futuro">➡️</span>
                    </div>
                    <div class="mes-content">
                        <div class="sem-vencedor">Aguardando...</div>
                    </div>
                `;
            }
            
            grid.appendChild(card);
        });
    }

    // ============ ÚLTIMAS PARTIDAS (5) ============
    async loadUltimasPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const data = await response.json();
            
            if (data.success) {
                const tbody = document.querySelector('#ultimas-partidas tbody');
                if (!tbody) return;
                
                tbody.innerHTML = '';
                
                // Pegar apenas as últimas 5
                const ultimas = data.partidas.slice(0, 5);
                
                ultimas.forEach(partida => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${this.formatarData(partida.data)}</td>
                        <td>
                            <strong style="color: #10b981;">
                                ${partida.vencedor}
                            </strong>
                        </td>
                        <td>
                            <span class="badge ${this.getBadgeClass(partida.tipo)}">
                                ${partida.tipo || 'global'}
                            </span>
                        </td>
                        <td>${partida.participantes?.length || 0}</td>
                        <td>${partida.observacoes || '-'}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
            
        } catch (error) {
            console.error('Erro ao carregar últimas partidas:', error);
        }
    }

    // ============ GRÁFICOS ============
    async loadChartData() {
        try {
            await Promise.all([
                this.loadPatentesChart(),
                this.loadAssiduidadeChart()
            ]);
            
        } catch (error) {
            console.error('❌ Erro nos gráficos:', error);
        }
    }

    async loadPatentesChart() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/patentes-reais`);
            const data = await response.json();
            
            if (data.success) {
                this.createPatentesChart(data.distribuicao);
            }
            
        } catch (error) {
            console.error('❌ Erro patentes:', error);
        }
    }

    async loadAssiduidadeChart() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/assiduidade-real`);
            const data = await response.json();
            
            if (data.success) {
                this.createAssiduidadeChart(data.participacao);
            }
            
        } catch (error) {
            console.error('❌ Erro assiduidade:', error);
        }
    }

    createPatentesChart(distribuicao) {
        const ctx = document.getElementById('chart-patentes');
        if (!ctx) return;
        
        if (this.charts.patentes) {
            this.charts.patentes.destroy();
        }
        
        const labels = Object.keys(distribuicao);
        const valores = Object.values(distribuicao);
        
        this.charts.patentes = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: valores,
                    backgroundColor: this.getCoresPatentes(labels),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'white',
                            font: { size: 12 }
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

    createAssiduidadeChart(participacao) {
        const ctx = document.getElementById('chart-assiduidade');
        if (!ctx) return;
        
        if (this.charts.assiduidade) {
            this.charts.assiduidade.destroy();
        }
        
        if (!participacao || participacao.length === 0) {
            ctx.parentElement.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    Dados de participação serão exibidos aqui
                </div>
            `;
            return;
        }
        
        const labels = participacao.map(item => item.apelido);
        const valores = participacao.map(item => item.participacoes || item.partidas || 0);
        
        this.charts.assiduidade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Participações',
                    data: valores,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'rgba(255,255,255,0.7)' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { 
                            color: 'rgba(255,255,255,0.7)',
                            maxRotation: 45
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white' }
                    }
                }
            }
        });
    }

    // ============ MÉTODOS AUXILIARES ============
    getCoresPatentes(patentes) {
        const coresPadrao = [
            '#9ca3af', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
            '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#fbbf24'
        ];
        
        return patentes.map((_, index) => 
            coresPadrao[index % coresPadrao.length]
        );
    }

    formatarData(dataString) {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    getBadgeClass(tipo) {
        const classes = {
            'global': 'badge-primary',
            'campeonato': 'badge-warning',
            'amistosa': 'badge-info',
            'eliminatoria': 'badge-danger'
        };
        return classes[tipo] || 'badge-secondary';
    }

    setupEventListeners() {
        const selectAno = document.getElementById('select-ano');
        if (selectAno) {
            selectAno.addEventListener('change', () => {
                this.loadVencedoresMensais();
            });
        }
        
        const exportButtons = document.querySelectorAll('.export-btn');
        exportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tipo = e.target.id.replace('export-', '');
                this.exportarDados(tipo);
            });
        });
    }

    startAutoRefresh() {
        setInterval(() => {
            this.loadEstatisticasDashboard();
            this.loadPodios();
            this.loadUltimasPartidas();
        }, 30000);
    }

    updateTimestamp() {
        const elemento = document.getElementById('last-update');
        if (elemento) {
            elemento.textContent = new Date().toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }

    showError(mensagem) {
        console.error('Erro no dashboard:', mensagem);
    }

    async exportarDados(tipo) {
        try {
            let url, filename;
            
            switch(tipo) {
                case 'jogadores':
                    url = `${this.apiBase}/jogadores`;
                    filename = `jogadores-war-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'partidas':
                    url = `${this.apiBase}/partidas`;
                    filename = `partidas-war-${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'estatisticas':
                    url = `${this.apiBase}/estatisticas/dashboard`;
                    filename = `estatisticas-war-${new Date().toISOString().split('T')[0]}.json`;
                    break;
                default:
                    return;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (tipo === 'estatisticas') {
                // Exportar como JSON
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();
            } else {
                // Exportar como CSV (simplificado)
                const items = tipo === 'jogadores' ? data.jogadores : data.partidas;
                const csv = this.converterParaCSV(items);
                const blob = new Blob([csv], { type: 'text/csv' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                link.click();
            }
            
            console.log(`✅ Dados exportados: ${filename}`);
            
        } catch (error) {
            console.error('❌ Erro ao exportar dados:', error);
        }
    }

    converterParaCSV(items) {
        if (!items || items.length === 0) return '';
        
        const headers = Object.keys(items[0]).join(',');
        const rows = items.map(item => 
            Object.values(item).map(val => 
                typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
            ).join(',')
        );
        
        return [headers, ...rows].join('\n');
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new DashboardMongoDB();
});
