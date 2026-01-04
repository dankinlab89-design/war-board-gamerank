// public/js/dashboard-mongodb.js - VERSÃO CORRIGIDA
class DashboardMongoDB {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.currentYear = new Date().getFullYear();
    }

    async init() {
        console.log('🚀 Dashboard MongoDB inicializando...');
        await this.loadAllData();
        this.setupEventListeners();
        this.setupExportButtons();
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
            
            console.log('✅ Todos os dados carregados');
            
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
                
                document.getElementById('stat-jogadores').textContent = stats.total_jogadores;
                document.getElementById('trend-jogadores').textContent = '100% ativos';
                
                document.getElementById('stat-partidas').textContent = stats.total_partidas;
                document.getElementById('trend-partidas').textContent = `${stats.percentual_mes}% este mês`;
                
                document.getElementById('stat-record').textContent = stats.record_consecutivo;
                document.getElementById('record-holder').textContent = stats.record_holder_consecutivo;
            }
            
        } catch (error) {
            console.error('Erro estatísticas:', error);
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
            console.error('Erro pódio global:', error);
        }
    }

    async loadPodioMensal() {
        try {
            console.log('📅 Carregando pódio mensal...');
            const response = await fetch(`${this.apiBase}/podios/mensal`);
            const data = await response.json();
            
            const container = document.getElementById('podium-mensal');
            
            if (data.success && data.podio && data.podio.length > 0) {
                // Adicionar badge informativo
                const badgeHTML = '<div class="criterio-badge"><i class="fas fa-info-circle"></i><span>Critério: 1º Vitórias | 2º Partidas</span></div>';
                
                container.innerHTML = badgeHTML;
                this.renderizarPodio(data.podio, 'podium-mensal');
                
                console.log('✅ Pódio mensal carregado:', data.podio);
            } else {
                container.innerHTML = '<div class="no-data-message">Nenhuma partida este mês</div>';
            }
            
        } catch (error) {
            console.error('Erro pódio mensal:', error);
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
                container.innerHTML = '<div class="no-data-message">Mínimo 3 partidas para calcular performance</div>';
            }
            
        } catch (error) {
            console.error('Erro pódio performance:', error);
        }
    }

    renderizarPodio(podio, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const podioCompleto = [
            podio[0] || null,
            podio[1] || null,
            podio[2] || null
        ];
        
        const podiumHTML = `
            <div class="podium-dashboard">
                <div class="podium-item silver">
                    <div class="podium-rank">🥈</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[1]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <div class="stat-row">
                                <span class="stat-label">Vitórias:</span>
                                <span class="stat-value win">${podioCompleto[1]?.vitorias || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Partidas:</span>
                                <span class="stat-value match">${podioCompleto[1]?.partidas || 0}</span>
                            </div>
                        </div>
                        <div class="player-patente">${podioCompleto[1]?.patente || 'Cabo 🪖'}</div>
                    </div>
                </div>
                
                <div class="podium-item gold">
                    <div class="podium-rank">🥇</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[0]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <div class="stat-row">
                                <span class="stat-label">Vitórias:</span>
                                <span class="stat-value win">${podioCompleto[0]?.vitorias || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Partidas:</span>
                                <span class="stat-value match">${podioCompleto[0]?.partidas || 0}</span>
                            </div>
                        </div>
                        <div class="player-patente">${podioCompleto[0]?.patente || 'Cabo 🪖'}</div>
                    </div>
                </div>
                
                <div class="podium-item bronze">
                    <div class="podium-rank">🥉</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[2]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <div class="stat-row">
                                <span class="stat-label">Vitórias:</span>
                                <span class="stat-value win">${podioCompleto[2]?.vitorias || 0}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Partidas:</span>
                                <span class="stat-value match">${podioCompleto[2]?.partidas || 0}</span>
                            </div>
                        </div>
                        <div class="player-patente">${podioCompleto[2]?.patente || 'Cabo 🪖'}</div>
                    </div>
                </div>
            </div>
        `;
        
        if (containerId === 'podium-mensal') {
            // Já tem o badge, só adicionar o pódio
            container.insertAdjacentHTML('beforeend', podiumHTML);
        } else {
            container.innerHTML = podiumHTML;
        }
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
                        <div class="player-patente">${podioCompleto[1]?.patente || 'Cabo 🪖'}</div>
                    </div>
                </div>
                
                <div class="podium-item gold">
                    <div class="podium-rank">🥇</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[0]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[0]?.performance || 0}%</span> performance
                        </div>
                        <div class="player-patente">${podioCompleto[0]?.patente || 'Cabo 🪖'}</div>
                    </div>
                </div>
                
                <div class="podium-item bronze">
                    <div class="podium-rank">🥉</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[2]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[2]?.performance || 0}%</span> performance
                        </div>
                        <div class="player-patente">${podioCompleto[2]?.patente || 'Cabo 🪖'}</div>
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
                const grid = document.getElementById('vencedores-grid');
                if (grid) {
                    grid.innerHTML = 'Vencedores carregados...';
                }
            }
        } catch (error) {
            console.error('Erro vencedores mensais:', error);
        }
    }

    // ============ ÚLTIMAS PARTIDAS ============
    async loadUltimasPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas?limit=5`);
            const data = await response.json();
            
            if (data.success && data.partidas) {
                const tbody = document.querySelector('#ultimas-partidas tbody');
                if (tbody) {
                    tbody.innerHTML = data.partidas.map(partida => `
                        <tr>
                            <td>${new Date(partida.data).toLocaleDateString('pt-BR')}</td>
                            <td><strong>${partida.vencedor}</strong></td>
                            <td>${partida.tipo || 'global'}</td>
                            <td>${Array.isArray(partida.participantes) ? partida.participantes.length : 0}</td>
                            <td>${partida.observacoes || '-'}</td>
                        </tr>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Erro últimas partidas:', error);
        }
    }

    // ============ GRÁFICOS ============
    async loadChartData() {
        try {
            // Implementação básica dos gráficos
            this.initializeCharts();
        } catch (error) {
            console.error('Erro gráficos:', error);
        }
    }

    initializeCharts() {
        // Gráfico de patentes
        const ctxPatentes = document.getElementById('chart-patentes');
        if (ctxPatentes) {
            new Chart(ctxPatentes, {
                type: 'pie',
                data: {
                    labels: ['Cabo 🪖', 'Sargento ⭐', 'Tenente 🌟', 'Capitão 🎖️'],
                    datasets: [{
                        data: [12, 5, 3, 2],
                        backgroundColor: ['#1a472a', '#b8860b', '#8b0000', '#0d2d1c']
                    }]
                }
            });
        }
        
        // Gráfico de assiduidade
        const ctxAssiduidade = document.getElementById('chart-assiduidade');
        if (ctxAssiduidade) {
            new Chart(ctxAssiduidade, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                    datasets: [{
                        label: 'Partidas',
                        data: [8, 12, 6, 10, 15, 9],
                        backgroundColor: '#b8860b'
                    }]
                }
            });
        }
    }

    // ============ EXPORTAÇÃO CSV ============
    setupExportButtons() {
        const exportJogadores = document.getElementById('export-jogadores');
        const exportPartidas = document.getElementById('export-partidas');
        const exportEstatisticas = document.getElementById('export-estatisticas');
        
        if (exportJogadores) {
            exportJogadores.addEventListener('click', () => this.exportarCSV('jogadores'));
        }
        if (exportPartidas) {
            exportPartidas.addEventListener('click', () => this.exportarCSV('partidas'));
        }
        if (exportEstatisticas) {
            exportEstatisticas.addEventListener('click', () => this.exportarCSV('estatisticas'));
        }
    }

    async exportarCSV(tipo) {
        try {
            let endpoint, filename, data;
            
            switch(tipo) {
                case 'jogadores':
                    endpoint = '/jogadores';
                    filename = 'jogadores_war.csv';
                    break;
                case 'partidas':
                    endpoint = '/partidas';
                    filename = 'batalhas_war.csv';
                    break;
                case 'estatisticas':
                    endpoint = '/estatisticas/dashboard';
                    filename = 'estatisticas_war.csv';
                    break;
                default:
                    return;
            }
            
            const response = await fetch(`${this.apiBase}${endpoint}`);
            const result = await response.json();
            
            if (result.success) {
                this.downloadCSV(this.formatarParaCSV(result, tipo), filename);
                this.showNotification(`✅ ${tipo.charAt(0).toUpperCase() + tipo.slice(1)} exportados como CSV!`);
            }
        } catch (error) {
            console.error(`Erro exportar ${tipo}:`, error);
            this.showNotification('❌ Erro ao exportar dados', 'error');
        }
    }

    formatarParaCSV(data, tipo) {
        let csv = '';
        
        switch(tipo) {
            case 'jogadores':
                csv = 'Nome,Apelido,Email,Patente,Vitórias,Partidas,Status\n';
                data.jogadores.forEach(j => {
                    csv += `"${j.nome || ''}","${j.apelido || ''}","${j.email || ''}","${j.patente || ''}",${j.vitorias || 0},${j.partidas || 0},${j.ativo ? 'ATIVO' : 'INATIVO'}\n`;
                });
                break;
                
            case 'partidas':
                csv = 'Data,Vencedor,Tipo,Participantes,Pontos,Observações\n';
                data.partidas.forEach(p => {
                    const participantes = Array.isArray(p.participantes) ? p.participantes.join('; ') : '';
                    csv += `"${new Date(p.data).toLocaleDateString('pt-BR')}","${p.vencedor || ''}","${p.tipo || ''}","${participantes}",${p.pontos || 0},"${p.observacoes || ''}"\n`;
                });
                break;
                
            case 'estatisticas':
                const stats = data.estatisticas;
                csv = 'Estatística,Valor\n';
                csv += `Total Jogadores,${stats.total_jogadores || 0}\n`;
                csv += `Total Partidas,${stats.total_partidas || 0}\n`;
                csv += `Recorde Consecutivo,${stats.record_consecutivo || 0}\n`;
                csv += `Detentor Recorde,${stats.record_holder_consecutivo || '-'}\n`;
                csv += `Percentual Este Mês,${stats.percentual_mes || 0}%\n`;
                break;
        }
        
        return csv;
    }

    downloadCSV(csvContent, fileName) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (navigator.msSaveBlob) {
            navigator.msSaveBlob(blob, fileName);
        } else {
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // ============ UTILITÁRIOS ============
    setupEventListeners() {
        // Seletor de ano
        const selectAno = document.getElementById('select-ano');
        if (selectAno) {
            selectAno.addEventListener('change', () => this.loadVencedoresMensais());
        }
    }

    startAutoRefresh() {
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.loadAllData();
            this.updateTimestamp();
        }, 30000);
    }

    updateTimestamp() {
        const now = new Date();
        console.log(`🕒 Dashboard atualizado: ${now.toLocaleTimeString('pt-BR')}`);
    }

    showError(mensagem) {
        console.error('Erro Dashboard:', mensagem);
    }

    showNotification(mensagem, tipo = 'success') {
        // Implementação simples de notificação
        console.log(`📢 ${mensagem}`);
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DashboardMongoDB = DashboardMongoDB;
}
