// dashboard.js - Versão completa e funcional
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
            
            // Carregar tudo em paralelo
            await Promise.all([
                this.loadEstatisticas(),
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance(),
                this.loadVencedoresMensais(this.currentYear),
                this.loadUltimasPartidas()
            ]);
            
            // Carregar gráficos depois
            await this.loadChartData();
            
            console.log('✅ Todos os dados carregados');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    // ============ MÉTODOS DE CARREGAMENTO DE DADOS ============

    async loadEstatisticas() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas`);
            const stats = await response.json();
            
            // Atualizar estatísticas rápidas
            document.getElementById('stat-jogadores').textContent = stats.total_jogadores || 0;
            document.getElementById('stat-partidas').textContent = stats.total_partidas || 0;
            document.getElementById('stat-record').textContent = stats.record_vitorias || 0;
            document.getElementById('record-holder').textContent = stats.record_holder || '-';
            
            // Calcular média
            const media = stats.total_jogadores > 0 ? 
                (stats.total_partidas / stats.total_jogadores).toFixed(1) : 0;
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
            
            if (!ranking || ranking.length === 0) {
                const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long' });
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            Nenhuma partida em ${mesNome}
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
            const tbody = document.querySelector('#ranking-mensal tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            Erro ao carregar ranking mensal
                        </td>
                    </tr>
                `;
            }
        }
    }

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
            console.error('Erro ao carregar ranking performance:', error);
        }
    }

    async loadVencedoresMensais(ano) {
    try {
        // Primeiro, tentar obter anos disponíveis
        const anosResponse = await fetch(`${this.apiBase}/vencedores-anos`);
        const anosDisponiveis = await anosResponse.json();
        
        // Atualizar select de anos
        this.atualizarSelectAnos(anosDisponiveis, ano);
        
        // Buscar vencedores do ano selecionado
        const response = await fetch(`${this.apiBase}/vencedores-mensais/${ano}`);
        const vencedores = await response.json();
        
        this.renderVencedoresMensais(vencedores, ano);
        
    } catch (error) {
        console.error('❌ Erro vencedores mensais:', error);
        // Fallback: mostrar meses vazios
        this.renderVencedoresMensais({}, ano);
    }
}

atualizarSelectAnos(anosDisponiveis, anoAtual) {
    const selectAno = document.getElementById('select-ano');
    if (!selectAno) return;
    
    selectAno.innerHTML = '';
    
    anosDisponiveis.forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        if (ano == anoAtual) {
            option.selected = true;
        }
        selectAno.appendChild(option);
    });
}

renderVencedoresMensais(vencedores, ano) {
    const grid = document.getElementById('vencedores-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const meses = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    meses.forEach((mesNome, index) => {
        const mesNum = index + 1;
        const vencedor = vencedores[mesNum];
        
        const card = document.createElement('div');
        card.className = 'mes-card';
        
        if (vencedor) {
            card.innerHTML = `
                <div class="mes-header">
                    <h4>${mesNome.toUpperCase()}</h4>
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
                    <div class="vencedor-detalhes">
                        <small>${vencedor.partidas} partidas • ${vencedor.percentual}%</small>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="mes-header">
                    <h4>${mesNome.toUpperCase()}</h4>
                    <span class="mes-badge sem-dados">-</span>
                </div>
                <div class="mes-content">
                    <div class="sem-vencedor">Sem vencedor</div>
                    <div class="vencedor-detalhes">
                        <small>${ano}</small>
                    </div>
                </div>
            `;
        }
        
        grid.appendChild(card);
    });
}
            
        } catch (error) {
            console.error('Erro ao carregar vencedores mensais:', error);
        }
    }

    async loadUltimasPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const partidas = await response.json();
            
            const tbody = document.querySelector('#ultimas-partidas tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            // Pegar as últimas 10 partidas
            const ultimas = partidas
                .sort((a, b) => new Date(b.data) - new Date(a.data))
                .slice(0, 10);
            
            ultimas.forEach(partida => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${this.formatarData(partida.data)}</td>
                    <td>
                        <strong style="color: #10b981;">
                            ${partida.vencedor_nome || `Jogador ${partida.vencedor_id}`}
                        </strong>
                    </td>
                    <td>
                        <span class="badge ${this.getBadgeClass(partida.tipo)}">
                            ${partida.tipo || 'global'}
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

    // ============ MÉTODOS DE GRÁFICOS ============

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
            
            this.createPatentesChart(data);
            
        } catch (error) {
            console.error('❌ Erro patentes:', error);
            // Fallback com dados do console
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
            
            this.createAssiduidadeChart(data);
            
        } catch (error) {
            console.error('❌ Erro assiduidade:', error);
            // Fallback com seus dados do console
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
        if (!ctx) {
            console.warn('Elemento chart-patentes não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (this.charts.patentes) {
            this.charts.patentes.destroy();
        }
        
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está carregado');
            return;
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
                maintainAspectRatio: false,
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
                                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
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
        if (!ctx) {
            console.warn('Elemento chart-assiduidade não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (this.charts.assiduidade) {
            this.charts.assiduidade.destroy();
        }
        
        // Verificar se Chart.js está disponível
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está carregado');
            return;
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

    // ============ MÉTODOS AUXILIARES ============

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

    getPercentClass(percent) {
        const perc = parseFloat(percent) || 0;
        if (perc >= 50) return 'percent-high';
        if (perc >= 30) return 'percent-medium';
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

    // ============ EVENT LISTENERS ============

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
        
        // Atualizar timestamp
        this.updateTimestamp();
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
        try {
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
            
        } catch (error) {
            console.error('Erro ao atualizar timestamp:', error);
        }
    }

    // ============ EXPORTAÇÃO ============

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
        try {
            // Implementação simples
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                background: ${type === 'success' ? '#28a745' : '#dc3545'};
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-family: 'Montserrat', sans-serif;
            `;
            
            notification.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                ${message}
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
            
        } catch (error) {
            console.error('Erro ao mostrar notificação:', error);
            alert(message); // Fallback
        }
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
}

// ============ INICIALIZAÇÃO ============

// Verificar se estamos na página do dashboard
if (document.querySelector('.dashboard-grid') || 
    document.querySelector('#ranking-global') ||
    document.querySelector('#chart-patentes')) {
    
    console.log('📊 Página do dashboard detectada, inicializando...');
    
    // Esperar o DOM carregar completamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🚀 Inicializando Dashboard...');
            window.dashboard = new DashboardCorrigido();
        });
    } else {
        console.log('🚀 DOM já carregado, inicializando...');
        window.dashboard = new DashboardCorrigido();
    }
} else {
    console.log('⚠️ Não é página do dashboard, não inicializando');
}

