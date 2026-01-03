// dashboard.js - VERSÃO ATUALIZADA
class DashboardAtualizado {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.currentYear = new Date().getFullYear();
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando Dashboard Atualizado...');
        await this.loadAllData();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.updateTimestamp();
    }

    async loadAllData() {
        try {
            console.log('🔄 Carregando dados atualizados...');
            
            await Promise.all([
                this.loadEstatisticasAtualizadas(),
                this.loadPodios(),
                this.loadVencedoresMensaisComHistorico(),
                this.loadUltimasPartidasLimitado()
            ]);
            
            await this.loadChartDataReal();
            
            console.log('✅ Todos os dados carregados');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    // ============ ESTATÍSTICAS ATUALIZADAS ============

    async loadEstatisticasAtualizadas() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas`);
            const stats = await response.json();
            
            // Total de jogadores com porcentagem
            const totalJogadores = stats.total_jogadores || 0;
            document.getElementById('stat-jogadores').textContent = totalJogadores;
            
            // Calcular porcentagem de crescimento
            const crescimentoJogadores = stats.crescimento_jogadores || 0;
            document.getElementById('trend-jogadores').textContent = 
                `${crescimentoJogadores}% do total`;
            
            // Total de partidas com porcentagem mensal
            const totalPartidas = stats.total_partidas || 0;
            const partidasMesAtual = stats.partidas_mes_atual || 0;
            document.getElementById('stat-partidas').textContent = totalPartidas;
            
            const percentualMes = totalPartidas > 0 ? 
                Math.round((partidasMesAtual / totalPartidas) * 100) : 0;
            document.getElementById('trend-partidas').textContent = 
                `${percentualMes}% no mês`;
            
            // Recorde de vitórias consecutivas (nova funcionalidade)
            const recordeConsecutivo = stats.record_consecutivo || 0;
            const recordHolder = stats.record_holder_consecutivo || '-';
            document.getElementById('stat-record').textContent = recordeConsecutivo;
            document.getElementById('record-holder').textContent = recordHolder;
            
            // Média de vitórias por jogador
            const media = totalJogadores > 0 ? 
                (stats.total_vitorias / totalJogadores).toFixed(1) : 0;
            document.getElementById('stat-media').textContent = media;
            
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // ============ PÓDIOS ============

    async loadPodios() {
        await Promise.all([
            this.loadPodioGlobal(),
            this.loadPodioMensal(),
            this.loadPodioPerformance()
        ]);
    }

    async loadPodioGlobal() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/global`);
            const ranking = await response.json();
            
            const container = document.getElementById('podium-global');
            if (!container) return;
            
            container.innerHTML = this.criarHTMLPodio(ranking.slice(0, 3));
            
        } catch (error) {
            console.error('Erro ao carregar pódio global:', error);
        }
    }

    async loadPodioMensal() {
        try {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = hoje.getMonth() + 1;
            
            const response = await fetch(`${this.apiBase}/ranking/mensal/${ano}/${mes}`);
            const ranking = await response.json();
            
            const container = document.getElementById('podium-mensal');
            if (!container) return;
            
            if (!ranking || ranking.length === 0) {
                const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long' });
                container.innerHTML = `
                    <div class="no-data-message">
                        Nenhuma partida registrada em ${mesNome}
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.criarHTMLPodio(ranking.slice(0, 3));
            
        } catch (error) {
            console.error('Erro ao carregar pódio mensal:', error);
        }
    }

    async loadPodioPerformance() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/performance`);
            const ranking = await response.json();
            
            const container = document.getElementById('podium-performance');
            if (!container) return;
            
            if (!ranking || ranking.length === 0) {
                container.innerHTML = `
                    <div class="no-data-message">
                        Mínimo 3 partidas para calcular performance
                    </div>
                `;
                return;
            }
            
            container.innerHTML = this.criarHTMLPodioPerformance(ranking.slice(0, 3));
            
        } catch (error) {
            console.error('Erro ao carregar pódio performance:', error);
        }
    }

    criarHTMLPodio(podio) {
        if (!podio || podio.length === 0) {
            return '<div class="no-data-message">Sem dados para exibir</div>';
        }
        
        // Garantir que temos 3 posições
        const podioCompleto = [
            podio[0] || null,
            podio[1] || null,
            podio[2] || null
        ];
        
        return `
            <div class="podium-dashboard">
                <div class="podium-item silver">
                    <div class="podium-rank">🥈</div>
                    <div class="podium-player">
                        <div class="player-name">${podioCompleto[1]?.apelido || '-'}</div>
                        <div class="player-stats">
                            <span>${podioCompleto[1]?.vitorias || 0}</span> vitórias
                        </div>
                        <div class="player-patente">
                            ${podioCompleto[1]?.patente || 'Recruta'}
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
                            ${podioCompleto[0]?.patente || 'Recruta'}
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
                            ${podioCompleto[2]?.patente || 'Recruta'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============ VENCEDORES MENSAIS COM HISTÓRICO ============

    async loadVencedoresMensaisComHistorico() {
        try {
            const anoSelecionado = document.getElementById('select-ano')?.value || this.currentYear;
            
            // Se for 2025, mostrar ranking anual especial
            if (anoSelecionado == 2025) {
                this.mostrarRankingAnual2025();
                return;
            }
            
            // Para outros anos, buscar dados mensais
            const response = await fetch(`${this.apiBase}/vencedores/mensal/${anoSelecionado}`);
            const vencedores = await response.json();
            
            this.renderizarVencedoresMensais(vencedores, anoSelecionado);
            
        } catch (error) {
            console.error('Erro ao carregar vencedores mensais:', error);
            this.mostrarFallbackVencedores();
        }
    }

    mostrarRankingAnual2025() {
        const grid = document.getElementById('vencedores-grid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="ranking-anual-2025">
                <div class="ano-card">
                    <div class="ano-header">
                        <h4>🏆 2025 - PRIMEIRO ANO 🏆</h4>
                    </div>
                    <div class="ano-content">
                        <div class="ranking-item gold">
                            <span class="rank">🥇</span>
                            <span class="nome">NEY2003</span>
                            <span class="vitorias">30 vitórias</span>
                        </div>
                        <div class="ranking-item silver">
                            <span class="rank">🥈</span>
                            <div class="empate">
                                <span class="nome">PetroIdeal</span>
                                <span class="vitorias">22 vitórias</span>
                            </div>
                            <div class="empate">
                                <span class="nome">Daniel$80</span>
                                <span class="vitorias">22 vitórias</span>
                            </div>
                        </div>
                        <div class="ranking-item bronze">
                            <span class="rank">🥉</span>
                            <span class="nome">TucaRei</span>
                            <span class="vitorias">21 vitórias</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
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
            const vencedorMes = vencedores.find(v => v.mes === mesNumero);
            
            const card = document.createElement('div');
            card.className = 'mes-card';
            
            if (vencedorMes) {
                // Mês com vencedor registrado
                card.innerHTML = `
                    <div class="mes-header">
                        <h4>${mes.toUpperCase()}</h4>
                        <span class="mes-badge vencedor">🏆</span>
                    </div>
                    <div class="mes-content">
                        <div class="vencedor-nome">${vencedorMes.apelido}</div>
                        <div class="vencedor-stats">
                            <div class="vitorias">${vencedorMes.vitorias} vitórias</div>
                            <div class="participacoes">${vencedorMes.partidas} partidas</div>
                        </div>
                    </div>
                `;
            } else if (ano < this.currentYear || 
                      (ano === this.currentYear && mesNumero <= new Date().getMonth() + 1)) {
                // Mês passado sem dados
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
                // Mês futuro
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

    // ============ ÚLTIMAS PARTIDAS (APENAS 5) ============

    async loadUltimasPartidasLimitado() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const partidas = await response.json();
            
            const tbody = document.querySelector('#ultimas-partidas tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            // Pegar apenas as últimas 5 partidas
            const ultimas = partidas
                .sort((a, b) => new Date(b.data) - new Date(a.data))
                .slice(0, 5);
            
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

    // ============ GRÁFICOS COM DADOS REAIS ============

    async loadChartDataReal() {
        try {
            await Promise.all([
                this.loadPatentesChartReal(),
                this.loadAssiduidadeChartReal()
            ]);
            
        } catch (error) {
            console.error('❌ Erro nos gráficos:', error);
        }
    }

    async loadPatentesChartReal() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/patentes-reais`);
            const data = await response.json();
            
            this.createPatentesChartReal(data);
            
        } catch (error) {
            console.error('❌ Erro patentes reais:', error);
            // Tentar endpoint antigo como fallback
            const fallbackResponse = await fetch(`${this.apiBase}/estatisticas/patentes`);
            const fallbackData = await fallbackResponse.json();
            this.createPatentesChartReal(fallbackData);
        }
    }

    createPatentesChartReal(data) {
        const ctx = document.getElementById('chart-patentes');
        if (!ctx) return;
        
        if (this.charts.patentes) {
            this.charts.patentes.destroy();
        }
        
        this.charts.patentes = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        '#9ca3af', // Recruta
                        '#10b981', // Soldado
                        '#3b82f6', // Cabo
                        '#8b5cf6', // Sargento
                        '#f59e0b', // Tenente
                        '#ef4444', // Capitão
                        '#ec4899', // Major
                        '#6366f1', // Coronel
                        '#14b8a6', // General
                        '#fbbf24'  // Marechal
                    ],
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
                            font: {
                                size: 12
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

    async loadAssiduidadeChartReal() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/assiduidade-real`);
            const data = await response.json();
            
            this.createAssiduidadeChartReal(data);
            
        } catch (error) {
            console.error('❌ Erro assiduidade real:', error);
            // Fallback com dados básicos
            this.createAssiduidadeChartReal([]);
        }
    }

    createAssiduidadeChartReal(data) {
        const ctx = document.getElementById('chart-assiduidade');
        if (!ctx) return;
        
        if (this.charts.assiduidade) {
            this.charts.assiduidade.destroy();
        }
        
        // Se não houver dados, mostrar mensagem
        if (!data || data.length === 0) {
            ctx.parentElement.innerHTML = `
                <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    Dados de participação serão exibidos aqui
                </div>
            `;
            return;
        }
        
        const labels = data.map(item => item.apelido);
        const valores = data.map(item => item.participacoes || item.partidas || 0);
        
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
                        ticks: {
                            color: 'rgba(255,255,255,0.7)'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255,255,255,0.7)',
                            maxRotation: 45
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }

    // ============ MÉTODOS AUXILIARES ============

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
        // Seletor de ano para vencedores mensais
        const selectAno = document.getElementById('select-ano');
        if (selectAno) {
            selectAno.addEventListener('change', () => {
                this.loadVencedoresMensaisComHistorico();
            });
        }
        
        // Botões de exportação (manter funcionalidade existente)
        const exportButtons = document.querySelectorAll('.export-btn');
        exportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tipo = e.target.id.replace('export-', '');
                this.exportarDados(tipo);
            });
        });
    }

    startAutoRefresh() {
        // Atualizar a cada 30 segundos
        setInterval(() => {
            this.loadEstatisticasAtualizadas();
            this.loadPodios();
            this.loadUltimasPartidasLimitado();
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
        // Você pode implementar notificações bonitas aqui
    }
}

// Inicializar dashboard quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new DashboardAtualizado();
});
