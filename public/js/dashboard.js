// dashboard.js - Versão atualizada e completa
class DashboardCompleto {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.currentYear = new Date().getFullYear();
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
                this.loadVencedoresMensais(this.currentYear),
                this.loadUltimasPartidas()
            ]);
            
            // Carregar dados para gráficos
            await this.loadChartData();
            
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
            document.getElementById('stat-record').textContent = data.record_consecutivas || 0;
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
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            ranking.forEach((jogador, index) => {
                const percentual = jogador.partidas > 0 ? 
                    ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0;
                const pontos = (jogador.vitorias * 10) + (jogador.partidas * 2);
                
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
                        <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
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
                    <td>
                        <span class="patente-badge ${this.getPatenteClass(jogador.patente)}">
                            ${jogador.patente}
                        </span>
                    </td>
                    <td style="color: #10b981; font-weight: bold;">${jogador.vitorias || 0}</td>
                    <td>${jogador.partidas || 0}</td>
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

   // NO dashboard.js - CORREÇÃO DO BUG DE 'undefined%'
async loadRankingPerformance() {
    try {
        const response = await fetch(`${this.apiBase}/ranking/performance`);
        const ranking = await response.json();
        
        const tbody = document.querySelector('#ranking-performance tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-data-message">
                        Mínimo 3 partidas para calcular performance
                    </td>
                </tr>
            `;
            return;
        }
        
        ranking.forEach((jogador, index) => {
            // CORREÇÃO AQUI: usar 'percentual' em vez de 'performance'
            const performance = parseFloat(jogador.percentual) || 0;
            const nivel = this.getNivelPerformance(performance);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${jogador.apelido}</strong></td>
                <td>
                    <span class="patente-badge ${this.getPatenteClass(jogador.patente)}">
                        ${jogador.patente}
                    </span>
                </td>
                <td style="color: #10b981; font-weight: bold;">${jogador.vitorias || 0}</td>
                <td>${jogador.partidas || 0}</td>
                <td>
                    <span class="performance-score ${this.getPerformanceClass(performance)}">
                        ${performance.toFixed(1)}%
                    </span>
                </td>
                <td>
                    <span class="nivel-badge nivel-${nivel.toLowerCase().replace(' ', '-')}">
                        ${nivel}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Erro ao carregar ranking performance:', error);
    }
}

    async loadVencedoresMensais(ano) {
        try {
            const response = await fetch(`${this.apiBase}/vencedores/mensal/${ano}`);
            const vencedores = await response.json();
            
            const grid = document.getElementById('vencedores-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            
            const meses = [
                'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
            ];
            
            meses.forEach((mes, index) => {
                const mesNum = index + 1;
                const vencedor = vencedores.find(v => v.mes === mesNum);
                
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
                                <span class="patente-badge ${this.getPatenteClass(vencedor.patente)}">
                                    ${vencedor.patente}
                                </span>
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

    async loadUltimasPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas/recentes`);
            const partidas = await response.json();
            
            const tbody = document.querySelector('#ultimas-partidas tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            partidas.slice(0, 10).forEach(partida => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${this.formatarData(partida.data)}</td>
                    <td>
                        <strong style="color: #10b981;">
                            ${partida.vencedor_nome}
                        </strong>
                    </td>
                    <td>
                        <span class="badge ${this.getBadgeClass(partida.tipo)}">
                            ${partida.tipo}
                        </span>
                    </td>
                    <td>${partida.participantes ? partida.participantes.split(',').length : 0}</td>
                    <td>${partida.observacoes || '-'}</td>
                `;
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Erro ao carregar últimas partidas:', error);
        }
    }

    async loadChartData() {
        try {
            // Gráfico de patentes
            await this.loadPatentesChart();
            
            // Gráfico de assiduidade
            await this.loadAssiduidadeChart();
            
        } catch (error) {
            console.error('Erro ao carregar dados dos gráficos:', error);
        }
    }

    async loadPatentesChart() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/patentes`);
            const data = await response.json();
            
            this.createPatentesChart(data);
            
        } catch (error) {
            console.error('Erro ao carregar dados de patentes:', error);
            // Dados de fallback
            this.createPatentesChart({
                'Cabo 🪖': 5,
                'Soldado 🛡️': 3,
                'Tenente ⚔️': 2,
                'Capitão 👮': 1,
                'Major 💪': 1,
                'Coronel 🎖️': 0,
                'General ⭐': 0,
                'Marechal 🏆': 0
            });
        }
    }

    createPatentesChart(data) {
        const ctx = document.getElementById('chart-patentes');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (this.charts.patentes) {
            this.charts.patentes.destroy();
        }
        
        const labels = Object.keys(data);
        const values = Object.values(data);
        const cores = this.getPatenteColors(labels);
        
        this.charts.patentes = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: cores,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 20,
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

    async loadAssiduidadeChart() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/assiduidade`);
            const data = await response.json();
            
            this.createAssiduidadeChart(data);
            
        } catch (error) {
            console.error('Erro ao carregar dados de assiduidade:', error);
        }
    }

    createAssiduidadeChart(data) {
        const ctx = document.getElementById('chart-assiduidade');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (this.charts.assiduidade) {
            this.charts.assiduidade.destroy();
        }
        
        const labels = data.map(item => item.apelido);
        const values = data.map(item => item.partidas);
        
        this.charts.assiduidade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Partidas Jogadas',
                    data: values,
                    backgroundColor: 'rgba(184, 134, 11, 0.8)',
                    borderColor: 'rgba(184, 134, 11, 1)',
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)'
                        }
                    }
                },
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
                            color: 'rgba(255, 255, 255, 0.7)',
                            maxRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Métodos auxiliares
    getPatenteClass(patente) {
        if (!patente) return 'patente-cabo';
        if (patente.includes('Marechal')) return 'patente-marechal';
        if (patente.includes('General')) return 'patente-general';
        if (patente.includes('Coronel')) return 'patente-coronel';
        if (patente.includes('Major')) return 'patente-major';
        if (patente.includes('Capitão')) return 'patente-capitao';
        if (patente.includes('Tenente')) return 'patente-tenente';
        if (patente.includes('Soldado')) return 'patente-soldado';
        return 'patente-cabo';
    }

    getPatenteColors(patentes) {
        const colors = {
            'Cabo 🪖': '#6c757d',
            'Soldado 🛡️': '#28a745',
            'Tenente ⚔️': '#007bff',
            'Capitão 👮': '#6610f2',
            'Major 💪': '#e83e8c',
            'Coronel 🎖️': '#fd7e14',
            'General ⭐': '#ffc107',
            'Marechal 🏆': '#ffd700'
        };
        
        return patentes.map(p => colors[p] || '#6c757d');
    }

    getPercentClass(percent) {
        if (percent >= 50) return 'percent-high';
        if (percent >= 30) return 'percent-medium';
        return 'percent-low';
    }

    getPerformanceClass(performance) {
        if (performance >= 80) return 'performance-excellent';
        if (performance >= 60) return 'performance-good';
        if (performance >= 40) return 'performance-average';
        return 'performance-poor';
    }

    getNivelPerformance(performance) {
        if (performance >= 80) return 'ÉLITE';
        if (performance >= 60) return 'AVANÇADO';
        if (performance >= 40) return 'INTERMEDIÁRIO';
        return 'INICIANTE';
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

    formatarData(dataString) {
        if (!dataString) return '-';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR');
        } catch (e) {
            return dataString;
        }
    }

    setupEventListeners() {
        // Select de ano para vencedores mensais
        const selectAno = document.getElementById('select-ano');
        if (selectAno) {
            selectAno.addEventListener('change', (e) => {
                this.loadVencedoresMensais(e.target.value);
            });
        }
        
        // Botões de exportação
        this.setupExportButtons();
    }

    setupExportButtons() {
        // Exportar jogadores
        const exportJogadores = document.getElementById('export-jogadores');
        if (exportJogadores) {
            exportJogadores.addEventListener('click', async () => {
                await this.exportJogadoresCSV();
            });
        }
        
        // Exportar partidas
        const exportPartidas = document.getElementById('export-partidas');
        if (exportPartidas) {
            exportPartidas.addEventListener('click', async () => {
                await this.exportPartidasCSV();
            });
        }
    }

    async exportJogadoresCSV() {
        try {
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            
            // Criar CSV
            const headers = ['ID', 'Nome', 'Apelido', 'Patente', 'Status', 'Data Cadastro', 'Email', 'Observações'];
            const rows = jogadores.map(j => [
                j.id,
                `"${j.nome || ''}"`,
                `"${j.apelido || ''}"`,
                `"${j.patente || ''}"`,
                `"${j.status || ''}"`,
                `"${this.formatarData(j.data_cadastro)}"`,
                `"${j.email || ''}"`,
                `"${(j.observacoes || '').replace(/"/g, '""')}"`
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Criar e baixar arquivo
            this.downloadCSV(csvContent, `jogadores-war-${new Date().toISOString().split('T')[0]}.csv`);
            
            this.showNotification('✅ Jogadores exportados com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar jogadores:', error);
            this.showNotification('❌ Erro ao exportar jogadores', 'error');
        }
    }

    async exportPartidasCSV() {
        try {
            const response = await fetch(`${this.apiBase}/partidas/export`);
            const partidas = await response.json();
            
            // Criar CSV
            const headers = ['ID', 'Data', 'Tipo', 'Vencedor', 'Vencedor ID', 'Participantes', 'Observações'];
            const rows = partidas.map(p => [
                p.id,
                `"${this.formatarData(p.data)}"`,
                `"${p.tipo || ''}"`,
                `"${p.vencedor_nome || ''}"`,
                p.vencedor_id,
                `"${p.participantes || ''}"`,
                `"${(p.observacoes || '').replace(/"/g, '""')}"`
            ]);
            
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
            
            // Criar e baixar arquivo
            this.downloadCSV(csvContent, `partidas-war-${new Date().toISOString().split('T')[0]}.csv`);
            
            this.showNotification('✅ Partidas exportadas com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar partidas:', error);
            this.showNotification('❌ Erro ao exportar partidas', 'error');
        }
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    showNotification(message, type = 'info') {
        // Implementar notificação
        alert(message);
    }

    startAutoRefresh() {
        // Atualizar estatísticas a cada 30 segundos
        setInterval(async () => {
            await this.loadEstatisticas();
            await this.loadUltimasPartidas();
        }, 30000);
    }

    showError(message) {
        console.error(message);
        // Implementar notificação de erro
    }
}

// Inicializar dashboard quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new DashboardCompleto();
});// Dashboard WAR Board GameRank
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

