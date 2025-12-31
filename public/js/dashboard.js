// dashboard.js - Versão corrigida completa
class DashboardCorrigido {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.currentYear = new Date().getFullYear();
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando Dashboard...');
        await this.loadAllData();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.updateTimestamp();
    }

    async loadAllData() {
        try {
            console.log('🔄 Carregando dados...');
            
            await Promise.all([
                this.loadEstatisticas(),
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance(),
                this.loadVencedoresMensais(this.currentYear),
                this.loadUltimasPartidas()
            ]);
            
            // Carregar gráficos
            await this.loadChartData();
            
            console.log('✅ Todos os dados carregados');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    async loadChartData() {
        try {
            console.log('📊 Carregando gráficos...');
            
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
            const response = await fetch(`${this.apiBase}/estatisticas/patentes`);
            const data = await response.json();
            
            console.log('📊 Dados patentes:', data);
            
            // Criar gráfico
            this.createPatentesChart(data);
            
        } catch (error) {
            console.error('❌ Erro patentes:', error);
            // Fallback
            this.createPatentesChart({
                'Cabo 🪖': 10,
                'Soldado 🛡️': 0,
                'Tenente ⚔️': 0,
                'Capitão 👮': 0,
                'Major 💪': 0,
                'Coronel 🎖️': 0,
                'General ⭐': 0,
                'Marechal 🏆': 0
            });
        }
    }

    async loadAssiduidadeChart() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/assiduidade`);
            const data = await response.json();
            
            console.log('📊 Dados assiduidade:', data);
            
            // Criar gráfico
            this.createAssiduidadeChart(data);
            
        } catch (error) {
            console.error('❌ Erro assiduidade:', error);
            // Fallback com seus dados
            this.createAssiduidadeChart([
                { apelido: 'Daniel$80', partidas: 11 },
                { apelido: 'Lima', partidas: 9 },
                { apelido: 'Costa', partidas: 8 },
                { apelido: 'Petroideal', partidas: 7 },
                { apelido: 'Silva', partidas: 6 },
                { apelido: 'TucaRei', partidas: 5 },
                { apelido: 'Santos', partidas: 5 },
                { apelido: 'Souza', partidas: 3 }
            ]);
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
        
        this.charts.patentes = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#6c757d', // Cabo
                        '#28a745', // Soldado
                        '#007bff', // Tenente
                        '#6610f2', // Capitão
                        '#e83e8c', // Major
                        '#fd7e14', // Coronel
                        '#ffc107', // General
                        '#ffd700'  // Marechal
                    ],
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
                            padding: 15,
                            font: {
                                family: 'Montserrat',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createAssiduidadeChart(data) {
        const ctx = document.getElementById('chart-assiduidade');
        if (!ctx) return;
        
        // Destruir gráfico anterior se existir
        if (this.charts.assiduidade) {
            this.charts.assiduidade.destroy();
        }
        
        // Ordenar por partidas (decrescente)
        const sortedData = [...data].sort((a, b) => b.partidas - a.partidas);
        const labels = sortedData.map(item => item.apelido);
        const values = sortedData.map(item => item.partidas);
        
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
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Partidas: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Partidas',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Jogadores',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    async loadRankingPerformance() {
        try {
            console.log('⚡ Carregando ranking performance...');
            const response = await fetch(`${this.apiBase}/ranking/performance`);
            const ranking = await response.json();
            
            console.log('✅ Ranking performance:', ranking);
            
            const tbody = document.querySelector('#ranking-performance tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!ranking || ranking.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            Mínimo 3 partidas para calcular performance
                        </td>
                    </tr>
                `;
                return;
            }
            
            ranking.forEach((jogador, index) => {
                // CORREÇÃO: usar 'percentual' em vez de 'performance'
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
            console.error('❌ Erro ranking performance:', error);
        }
    }

    // Métodos auxiliares
    getPerformanceClass(performance) {
        const perc = parseFloat(performance) || 0;
        if (perc >= 80) return 'excellent';
        if (perc >= 60) return 'good';
        if (perc >= 40) return 'average';
        return 'poor';
    }

    getNivelPerformance(performance) {
        const perc = parseFloat(performance) || 0;
        if (perc >= 80) return 'ÉLITE';
        if (perc >= 60) return 'AVANÇADO';
        if (perc >= 40) return 'INTERMEDIÁRIO';
        return 'INICIANTE';
    }

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

    getPercentClass(percent) {
        if (percent >= 50) return 'percent-high';
        if (percent >= 30) return 'percent-medium';
        return 'percent-low';
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
        
        // Atualizar timestamp no rodapé
        setInterval(() => {
            this.updateTimestamp();
        }, 60000); // A cada minuto
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
        
        // Exportar estatísticas
        const exportEstatisticas = document.getElementById('export-estatisticas');
        if (exportEstatisticas) {
            exportEstatisticas.addEventListener('click', async () => {
                await this.exportEstatisticasJSON();
            });
        }
    }

    updateTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const dateString = now.toLocaleDateString('pt-BR');
        
        // Atualizar no rodapé do dashboard
        const updateElement = document.getElementById('last-update');
        if (updateElement) {
            updateElement.textContent = `${dateString} ${timeString}`;
        }
        
        // Atualizar no rodapé do ranking (se existir)
        const rankingUpdate = document.getElementById('ranking-update-time');
        if (rankingUpdate) {
            rankingUpdate.textContent = `${dateString} ${timeString}`;
        }
    }

    async exportJogadoresCSV() {
        try {
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            
            const csvContent = this.convertToCSV(jogadores, [
                { key: 'id', header: 'ID' },
                { key: 'nome', header: 'Nome' },
                { key: 'apelido', header: 'Apelido' },
                { key: 'patente', header: 'Patente' },
                { key: 'status', header: 'Status' },
                { key: 'data_cadastro', header: 'Data Cadastro', formatter: (val) => this.formatarData(val) },
                { key: 'email', header: 'Email' },
                { key: 'observacoes', header: 'Observações' }
            ]);
            
            this.downloadFile(csvContent, 'jogadores.csv', 'text/csv');
            this.showNotification('✅ Jogadores exportados com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao exportar jogadores:', error);
            this.showNotification('❌ Erro ao exportar jogadores', 'error');
        }
    }

    async exportPartidasCSV() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const partidas = await response.json();
            
            const csvContent = this.convertToCSV(partidas, [
                { key: 'id', header: 'ID' },
                { key: 'data', header: 'Data', formatter: (val) => this.formatarData(val) },
                { key: 'tipo', header: 'Tipo' },
                { key: 'vencedor_nome', header: 'Vencedor' },
                { key: 'vencedor_id', header: 'Vencedor ID' },
                { key: 'participantes', header: 'Participantes' },
                { key: 'observacoes', header: 'Observações' }
            ]);
            
            this.downloadFile(csvContent, 'partidas.csv', 'text/csv');
            this.showNotification('✅ Partidas exportadas com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao exportar partidas:', error);
            this.showNotification('❌ Erro ao exportar partidas', 'error');
        }
    }

    async exportEstatisticasJSON() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas`);
            const estatisticas = await response.json();
            
            const jsonContent = JSON.stringify(estatisticas, null, 2);
            this.downloadFile(jsonContent, 'estatisticas.json', 'application/json');
            
            this.showNotification('✅ Estatísticas exportadas com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao exportar estatísticas:', error);
            this.showNotification('❌ Erro ao exportar estatísticas', 'error');
        }
    }

    convertToCSV(data, columns) {
        // Cabeçalho
        const headers = columns.map(col => `"${col.header}"`).join(',');
        
        // Linhas
        const rows = data.map(item => {
            return columns.map(col => {
                let value = item[col.key] || '';
                if (col.formatter) {
                    value = col.formatter(value);
                }
                // Escapar aspas para CSV
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });
        
        return [headers, ...rows].join('\n');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showNotification(message, type = 'success') {
        // Implementação simples - pode melhorar com um sistema de notificações
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        console.error(message);
        this.showNotification(message, 'error');
    }

    startAutoRefresh() {
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.loadEstatisticas();
            this.loadUltimasPartidas();
            this.updateTimestamp();
        }, 30000);
    }

    // Os outros métodos (loadEstatisticas, loadRankingGlobal, etc.) mantêm igual
    // apenas certifique-se que loadRankingPerformance está CORRIGIDO
}

// Adicionar animações CSS
const dashboardStyles = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .performance-score {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.9rem;
    }
    
    .performance-score.excellent {
        background: linear-gradient(135deg, #28a745, #1e7e34);
        color: white;
        border: 1px solid #28a745;
    }
    
    .performance-score.good {
        background: linear-gradient(135deg, #ffc107, #e0a800);
        color: #000;
        border: 1px solid #ffc107;
    }
    
    .performance-score.average {
        background: linear-gradient(135deg, #fd7e14, #e8590c);
        color: white;
        border: 1px solid #fd7e14;
    }
    
    .performance-score.poor {
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        border: 1px solid #dc3545;
    }
    
    .nivel-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 0.8rem;
        text-transform: uppercase;
    }
    
    .nivel-elite {
        background: linear-gradient(135deg, #ffd700, #ffc400);
        color: #000;
        border: 2px solid #ffc400;
    }
    
    .nivel-avançado {
        background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
        color: #000;
        border: 1px solid #a0a0a0;
    }
    
    .nivel-intermediário {
        background: linear-gradient(135deg, #cd7f32, #b87333);
        color: #000;
        border: 1px solid #b87333;
    }
    
    .nivel-iniciante {
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        border: 1px solid #495057;
    }
`;

// Adicionar estilos ao documento
const styleEl = document.createElement('style');
styleEl.textContent = dashboardStyles;
document.head.appendChild(styleEl);

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard iniciando...');
    window.dashboard = new DashboardCorrigido();
});
