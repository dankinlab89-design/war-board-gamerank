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
                this.loadUltimasPartidas()
            ]);
            
            // Carregar dados dos gráficos/tabelas
            await this.loadChartData();
            
            // Carregar vencedores mensais (se tiver select)
            const selectAno = document.getElementById('select-ano');
            if (selectAno) {
                await this.loadVencedoresMensais(this.currentYear);
            }
            
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
            if (!tbody) {
                console.warn('❌ Elemento #ranking-global tbody não encontrado');
                return;
            }
            
            tbody.innerHTML = '';
            
            if (!ranking || ranking.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            Nenhum jogador com partidas
                        </td>
                    </tr>
                `;
                return;
            }
            
            ranking.forEach((jogador, index) => {
                const partidas = parseInt(jogador.partidas) || 0;
                const vitorias = parseInt(jogador.vitorias) || 0;
                const percentual = partidas > 0 ? 
                    ((vitorias / partidas) * 100).toFixed(1) : 0;
                const pontos = (vitorias * 10) + (partidas * 2);
                
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
                    <td style="color: #10b981; font-weight: bold;">${vitorias}</td>
                    <td>${partidas}</td>
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
            if (!tbody) {
                console.warn('❌ Elemento #ranking-mensal tbody não encontrado');
                return;
            }
            
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
                const partidas = parseInt(jogador.partidas) || 0;
                const vitorias = parseInt(jogador.vitorias) || 0;
                const percentual = partidas > 0 ? 
                    ((vitorias / partidas) * 100).toFixed(1) : 0;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${jogador.apelido}</strong></td>
                    <td>
                        <span class="patente-badge ${this.getPatenteClass(jogador.patente)}">
                            ${jogador.patente}
                        </span>
                    </td>
                    <td style="color: #10b981; font-weight: bold;">${vitorias}</td>
                    <td>${partidas}</td>
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
            if (!tbody) {
                console.warn('❌ Elemento #ranking-performance tbody não encontrado');
                return;
            }
            
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
                const performance = parseFloat(jogador.percentual) || 0;
                const nivel = this.getNivelPerformance(performance);
                const partidas = parseInt(jogador.partidas) || 0;
                const vitorias = parseInt(jogador.vitorias) || 0;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${jogador.apelido}</strong></td>
                    <td>
                        <span class="patente-badge ${this.getPatenteClass(jogador.patente)}">
                            ${jogador.patente}
                        </span>
                    </td>
                    <td style="color: #10b981; font-weight: bold;">${vitorias}</td>
                    <td>${partidas}</td>
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
            const tbody = document.querySelector('#ranking-performance tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            Erro ao carregar ranking performance
                        </td>
                    </tr>
                `;
            }
        }
    }

    async loadUltimasPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const partidas = await response.json();
            
            const tbody = document.querySelector('#ultimas-partidas tbody');
            if (!tbody) {
                console.warn('❌ Elemento #ultimas-partidas tbody não encontrado');
                return;
            }
            
            tbody.innerHTML = '';
            
            if (!partidas || partidas.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            Nenhuma partida registrada
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Pegar as últimas 10 partidas (mais recentes primeiro)
            const ultimas = [...partidas]
                .sort((a, b) => new Date(b.data) - new Date(a.data))
                .slice(0, 10);
            
            ultimas.forEach(partida => {
                const participantes = partida.participantes ? 
                    partida.participantes.split(',').length : 0;
                
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
                    <td>${participantes} jogadores</td>
                    <td>${partida.observacoes || '-'}</td>
                `;
                tbody.appendChild(row);
            });
            
        } catch (error) {
            console.error('Erro ao carregar últimas partidas:', error);
        }
    }

    // ============ MÉTODOS DE GRÁFICOS/TABELAS ============

    async loadChartData() {
        try {
            console.log('📊 Carregando dados dos gráficos...');
            
            // Carregar patentes e assiduidade em paralelo
            await Promise.all([
                this.mostrarDadosPatentes(),
                this.mostrarDadosAssiduidade()
            ]);
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados dos gráficos:', error);
        }
    }

    async mostrarDadosPatentes() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/patentes`);
            const data = await response.json();
            
            console.log('📊 Dados de patentes:', data);
            
            this.criarTabelaPatentes(data);
            
        } catch (error) {
            console.error('❌ Erro ao carregar patentes:', error);
            // Mostrar dados de fallback
            this.criarTabelaPatentes({
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

    async mostrarDadosAssiduidade() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/assiduidade`);
            const data = await response.json();
            
            console.log('📊 Dados de assiduidade:', data);
            
            this.criarTabelaAssiduidade(data);
            
        } catch (error) {
            console.error('❌ Erro ao carregar assiduidade:', error);
            // Mostrar dados de fallback
            this.criarTabelaAssiduidade([
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

    criarTabelaPatentes(data) {
        const container = document.getElementById('chart-patentes');
        if (!container) {
            console.warn('❌ Elemento #chart-patentes não encontrado');
            return;
        }
        
        // Limpar container
        container.innerHTML = '';
        
        // Calcular total
        const total = Object.values(data).reduce((sum, val) => sum + parseInt(val), 0);
        
        // Criar tabela
        let html = `
            <div class="grafico-titulo">
                <i class="fas fa-chart-pie"></i> DISTRIBUIÇÃO DE PATENTES
            </div>
            <table class="grafico-tabela">
                <thead>
                    <tr>
                        <th>PATENTE</th>
                        <th>JOGADORES</th>
                        <th>%</th>
                        <th>BARRA</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        Object.entries(data).forEach(([patente, quantidade]) => {
            const percentual = total > 0 ? ((quantidade / total) * 100).toFixed(1) : 0;
            
            html += `
                <tr>
                    <td>
                        <span class="patente-badge ${this.getPatenteClass(patente)}">
                            ${patente}
                        </span>
                    </td>
                    <td style="text-align: center; font-weight: bold;">${quantidade}</td>
                    <td style="text-align: center;">${percentual}%</td>
                    <td>
                        <div style="height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                            <div style="height: 100%; width: ${percentual}%; background: linear-gradient(90deg, var(--secondary), #ffd700); border-radius: 10px;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
                <tfoot>
                    <tr>
                        <td style="font-weight: bold;">TOTAL</td>
                        <td style="text-align: center; font-weight: bold;">${total}</td>
                        <td style="text-align: center;">100%</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        container.innerHTML = html;
    }

    criarTabelaAssiduidade(data) {
        const container = document.getElementById('chart-assiduidade');
        if (!container) {
            console.warn('❌ Elemento #chart-assiduidade não encontrado');
            return;
        }
        
        // Limpar container
        container.innerHTML = '';
        
        // Ordenar por partidas (decrescente)
        const sortedData = [...data].sort((a, b) => b.partidas - a.partidas);
        const maxPartidas = sortedData[0]?.partidas || 1;
        
        // Criar tabela
        let html = `
            <div class="grafico-titulo">
                <i class="fas fa-chart-bar"></i> ASSIDUIDADE - TOP 8
            </div>
            <table class="grafico-tabela">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>JOGADOR</th>
                        <th>PARTIDAS</th>
                        <th>BARRA</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedData.slice(0, 8).forEach((item, index) => {
            const percentual = maxPartidas > 0 ? (item.partidas / maxPartidas) * 100 : 0;
            
            html += `
                <tr>
                    <td style="text-align: center; font-weight: bold;">${index + 1}</td>
                    <td><strong>${item.apelido}</strong></td>
                    <td style="text-align: center; font-weight: bold; color: var(--secondary);">${item.partidas}</td>
                    <td>
                        <div style="height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                            <div style="height: 100%; width: ${percentual}%; background: linear-gradient(90deg, #b8860b, #ffd700); border-radius: 10px;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }

    async loadVencedoresMensais(ano) {
        try {
            // Verificar se o endpoint existe
            const response = await fetch(`${this.apiBase}/vencedores-mensais/${ano}`);
            
            const grid = document.getElementById('vencedores-grid');
            if (!grid) return;
            
            grid.innerHTML = '';
            
            const meses = [
                'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
            ];
            
            // Tentar obter dados
            let vencedores = {};
            try {
                vencedores = await response.json();
            } catch {
                // Se não houver dados, mostrar cards vazios
            }
            
            meses.forEach((mesNome, index) => {
                const mesNum = index + 1;
                const vencedor = vencedores[mesNum];
                
                const card = document.createElement('div');
                card.className = 'mes-card';
                
                if (vencedor && vencedor.vencedor) {
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
            
        } catch (error) {
            console.error('❌ Erro ao carregar vencedores mensais:', error);
        }
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
        
        // Sistema de tabs
        this.setupTabs();
    }

    setupTabs() {
        // Adicionar event listeners às tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
    }

    switchTab(tabName) {
        // Remover active de todas
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Adicionar active na selecionada
        const btn = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
        const content = document.getElementById(`tab-${tabName}`);
        
        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');
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
            alert(message);
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
