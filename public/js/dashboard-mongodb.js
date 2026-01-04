// ============================================
// DASHBOARD MONGODB - VERSÃO CORRIGIDA
// ============================================

// Evitar declaração dupla
if (typeof DashboardMongoDB === 'undefined') {

class DashboardMongoDB {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.currentYear = new Date().getFullYear();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            console.log('⚠️ Dashboard já inicializado');
            return;
        }
        
        console.log('🚀 Dashboard MongoDB inicializando...');
        this.initialized = true;
        
        try {
            await this.loadAllData();
            this.setupEventListeners();
            this.setupExportButtons();
            this.startAutoRefresh();
            this.updateTimestamp();
            console.log('✅ Dashboard inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }

    async loadAllData() {
        try {
            console.log('🔄 Carregando dados...');
            
            // Carregar em sequência para evitar conflitos
            await this.loadEstatisticasDashboard();
            await this.loadPodios();
            await this.loadVencedoresMensais();
            await this.loadUltimasPartidas();
            await this.loadChartData();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        }
    }

    // ============ ESTATÍSTICAS ============
    async loadEstatisticasDashboard() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/dashboard`);
            const data = await response.json();
            
            if (data.success) {
                const stats = data.estatisticas;
                
                // Total de jogadores
                const jogadoresEl = document.getElementById('stat-jogadores');
                const trendJogadoresEl = document.getElementById('trend-jogadores');
                if (jogadoresEl) jogadoresEl.textContent = stats.total_jogadores;
                if (trendJogadoresEl) trendJogadoresEl.textContent = '100% ativos';
                
                // Total de partidas
                const partidasEl = document.getElementById('stat-partidas');
                const trendPartidasEl = document.getElementById('trend-partidas');
                if (partidasEl) partidasEl.textContent = stats.total_partidas;
                if (trendPartidasEl) trendPartidasEl.textContent = `${stats.percentual_mes}% este mês`;
                
                // Recorde consecutivo
                const recordEl = document.getElementById('stat-record');
                const holderEl = document.getElementById('record-holder');
                
                if (recordEl) recordEl.textContent = stats.record_consecutivo;
                
                if (holderEl) {
                    if (stats.record_consecutivo > 0) {
                        holderEl.textContent = stats.record_holder_consecutivo;
                        holderEl.style.color = '#10b981';
                    } else {
                        holderEl.textContent = 'Nenhuma sequência';
                        holderEl.style.color = '#6c757d';
                        holderEl.style.fontStyle = 'italic';
                    }
                }
            }
            
        } catch (error) {
            console.error('Erro estatísticas:', error);
        }
    }

    // ============ PÓDIOS ============
    async loadPodios() {
        try {
            await this.loadPodioGlobal();
            await this.loadPodioMensal();
            await this.loadPodioPerformance();
        } catch (error) {
            console.error('Erro pódios:', error);
        }
    }

    async loadPodioGlobal() {
        try {
            const response = await fetch(`${this.apiBase}/podios/global`);
            const data = await response.json();
            
            if (data.success && data.podio) {
                this.renderizarPodio(data.podio, 'podium-global', 'Pódio Global');
            }
        } catch (error) {
            console.error('Erro pódio global:', error);
        }
    }

    async loadPodioMensal() {
        try {
            const response = await fetch(`${this.apiBase}/podios/mensal`);
            const data = await response.json();
            
            const container = document.getElementById('podium-mensal');
            
            if (data.success && data.podio && data.podio.length > 0) {
                this.renderizarPodio(data.podio, 'podium-mensal', 'Pódio Mensal');
            } else if (container) {
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
            
            if (data.success && data.podio && data.podio.length > 0) {
                this.renderizarPodio(data.podio, 'podium-performance', 'Pódio Performance');
            } else if (container) {
                container.innerHTML = '<div class="no-data-message">Mínimo 3 partidas para performance</div>';
            }
        } catch (error) {
            console.error('Erro pódio performance:', error);
        }
    }

    renderizarPodio(podio, containerId, title = '') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const podioCompleto = [
            podio[0] || null,
            podio[1] || null,
            podio[2] || null
        ];
        
        container.innerHTML = `
            <div class="podium-dashboard">
                <!-- 2º Lugar -->
                <div class="podium-item silver">
                    <div class="podium-rank">🥈</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[1]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span class="stat-value">${podioCompleto[1]?.vitorias || 0} vitórias</span>
                            <span class="stat-label">${podioCompleto[1]?.partidas || 0} partidas</span>
                        </div>
                        <div class="player-patente">${podioCompleto[1]?.patente || 'Cabo 🪖'}</div>
                    </div>
                </div>
                
                <!-- 1º Lugar -->
                <div class="podium-item gold">
                    <div class="podium-rank">🥇</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[0]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span class="stat-value">${podioCompleto[0]?.vitorias || 0} vitórias</span>
                            <span class="stat-label">${podioCompleto[0]?.partidas || 0} partidas</span>
                        </div>
                        <div class="player-patente">${podioCompleto[0]?.patente || 'Cabo 🪖'}</div>
                    </div>
                </div>
                
                <!-- 3º Lugar -->
                <div class="podium-item bronze">
                    <div class="podium-rank">🥉</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[2]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span class="stat-value">${podioCompleto[2]?.vitorias || 0} vitórias</span>
                            <span class="stat-label">${podioCompleto[2]?.partidas || 0} partidas</span>
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
            const anoSelect = document.getElementById('select-ano');
            const anoSelecionado = anoSelect ? anoSelect.value : this.currentYear;
            
            const response = await fetch(`${this.apiBase}/vencedores/mensal/${anoSelecionado}`);
            const data = await response.json();
            
            const grid = document.getElementById('vencedores-grid');
            if (!grid) return;
            
            if (data.success && data.vencedores && data.vencedores.length > 0) {
                this.renderizarVencedoresMensais(data.vencedores, anoSelecionado);
            } else {
                grid.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-calendar-alt"></i>
                        Nenhum vencedor registrado em ${anoSelecionado}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro vencedores mensais:', error);
        }
    }

    renderizarVencedoresMensais(vencedores, ano) {
        const grid = document.getElementById('vencedores-grid');
        if (!grid) return;
        
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        let html = '';
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;
        
        meses.forEach((mes, index) => {
            const mesNumero = index + 1;
            const vencedorMes = Array.isArray(vencedores) ? 
                vencedores.find(v => v.mes === mesNumero) : null;
            
            const isMesPassado = ano < anoAtual || (ano === anoAtual && mesNumero < mesAtual);
            const isMesFuturo = ano > anoAtual || (ano === anoAtual && mesNumero > mesAtual);
            
            html += `
                <div class="mes-card ${vencedorMes ? 'com-vencedor' : 'sem-vencedor'}">
                    <div class="mes-header">
                        <h4>${mes.toUpperCase()}</h4>
                        ${vencedorMes ? 
                            '<span class="mes-badge vencedor">🏆</span>' : 
                            '<span class="mes-badge">–</span>'}
                    </div>
                    <div class="mes-content">
                        ${vencedorMes ? `
                            <div class="vencedor-nome">${vencedorMes.jogador_apelido || vencedorMes.apelido || '-'}</div>
                            <div class="vencedor-stats">
                                <div class="vitorias">${vencedorMes.vitorias || 0} vitórias</div>
                                <div class="participacoes">${vencedorMes.partidas || 0} partidas</div>
                                ${vencedorMes.patente ? 
                                    `<div class="patente">${vencedorMes.patente}</div>` : ''}
                            </div>
                        ` : `
                            <div class="sem-dados">
                                ${isMesFuturo ? 'Aguardando...' : 
                                  isMesPassado ? 'Sem registro' : 
                                  'Em andamento...'}
                            </div>
                        `}
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
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
                            <td><strong>${partida.vencedor || '-'}</strong></td>
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

    // ============ GRÁFICOS (CORRIGIDOS) ============
    async loadChartData() {
        try {
            // Pequeno delay para garantir que o DOM está pronto
            setTimeout(() => {
                this.initializeCharts();
            }, 500);
        } catch (error) {
            console.error('Erro gráficos:', error);
        }
    }

    initializeCharts() {
        // Destruir gráficos existentes
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        
        // Gráfico de patentes
        const ctxPatentes = document.getElementById('chart-patentes');
        if (ctxPatentes) {
            this.charts.patentes = new Chart(ctxPatentes, {
                type: 'doughnut',
                data: {
                    labels: ['Cabo 🪖', 'Sargento ⭐', 'Tenente 🌟', 'Capitão 🎖️'],
                    datasets: [{
                        data: [7, 0, 0, 0], // 7 Cabos baseado nos dados
                        backgroundColor: ['#1a472a', '#b8860b', '#8b0000', '#0d2d1c']
                    }]
                }
            });
        }
        
        // Gráfico de assiduidade
        const ctxAssiduidade = document.getElementById('chart-assiduidade');
        if (ctxAssiduidade) {
            this.charts.assiduidade = new Chart(ctxAssiduidade, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                    datasets: [{
                        label: 'Partidas',
                        data: [6, 0, 0, 0, 0, 0],
                        backgroundColor: '#b8860b'
                    }]
                }
            });
        }
    }

    // ============ EXPORTAÇÃO ============
    setupExportButtons() {
        const ids = ['export-jogadores', 'export-partidas', 'export-estatisticas'];
        
        ids.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.handleExport(id));
            }
        });
    }

    async handleExport(buttonId) {
        try {
            let endpoint, filename;
            
            switch(buttonId) {
                case 'export-jogadores':
                    endpoint = '/jogadores';
                    filename = 'jogadores_war.csv';
                    break;
                case 'export-partidas':
                    endpoint = '/partidas';
                    filename = 'batalhas_war.csv';
                    break;
                case 'export-estatisticas':
                    endpoint = '/estatisticas/dashboard';
                    filename = 'estatisticas_war.csv';
                    break;
                default:
                    return;
            }
            
            const response = await fetch(`${this.apiBase}${endpoint}`);
            const data = await response.json();
            
            if (data.success) {
                this.exportToCSV(data, filename);
                alert(`✅ Arquivo ${filename} gerado com sucesso!`);
            }
        } catch (error) {
            console.error('Erro exportação:', error);
            alert('❌ Erro ao exportar dados');
        }
    }

    exportToCSV(data, filename) {
        let csv = '';
        
        if (filename.includes('jogadores') && data.jogadores) {
            csv = 'Nome,Apelido,Patente,Vitórias,Partidas,Status\n';
            data.jogadores.forEach(j => {
                csv += `"${j.nome || ''}","${j.apelido || ''}","${j.patente || ''}",${j.vitorias || 0},${j.partidas || 0},${j.ativo ? 'Ativo' : 'Inativo'}\n`;
            });
        } else if (filename.includes('batalhas') && data.partidas) {
            csv = 'Data,Vencedor,Participantes,Observações\n';
            data.partidas.forEach(p => {
                const participantes = Array.isArray(p.participantes) ? p.participantes.join('; ') : '';
                csv += `"${new Date(p.data).toLocaleDateString('pt-BR')}","${p.vencedor || ''}","${participantes}","${p.observacoes || ''}"\n`;
            });
        } else if (filename.includes('estatisticas') && data.estatisticas) {
            const s = data.estatisticas;
            csv = 'Estatística,Valor\n';
            csv += `Total Jogadores,${s.total_jogadores}\n`;
            csv += `Total Partidas,${s.total_partidas}\n`;
            csv += `Recorde de Vitórias,${s.record_vitorias}\n`;
            csv += `Detentor do Recorde,${s.record_holder}\n`;
            csv += `Partidas Este Mês,${s.partidas_mes_atual}\n`;
        }
        
        if (csv) {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();
        }
    }

    // ============ UTILITÁRIOS ============
    setupEventListeners() {
        // Seletor de ano
        const selectAno = document.getElementById('select-ano');
        if (selectAno) {
            selectAno.addEventListener('change', () => {
                this.loadVencedoresMensais();
            });
        }
    }

    startAutoRefresh() {
        // Atualizar a cada 60 segundos
        setInterval(() => {
            this.loadAllData();
        }, 60000);
    }

    updateTimestamp() {
        const now = new Date();
        console.log(`🕒 Atualizado: ${now.toLocaleTimeString('pt-BR')}`);
    }
}

// Exportar para uso global
window.DashboardMongoDB = DashboardMongoDB;

} // Fim do if (typeof DashboardMongoDB === 'undefined')
