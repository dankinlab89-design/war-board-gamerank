// dashboard-fixed.js - Versão corrigida com fallback
class DashboardCorrigido {
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
            console.log('🔄 Carregando dados do dashboard...');
            
            await Promise.all([
                this.loadEstatisticas(),
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance(),
                this.loadVencedoresMensais(this.currentYear),
                this.loadUltimasPartidas()
            ]);
            
            // Carregar gráficos após dados básicos
            await this.loadChartData();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }

    async loadChartData() {
        console.log('📊 Carregando dados dos gráficos...');
        
        try {
            // Tenta carregar dados reais
            await Promise.all([
                this.loadPatentesChartReal(),
                this.loadAssiduidadeChartReal()
            ]);
        } catch (error) {
            console.warn('⚠️ Usando dados fallback para gráficos');
            // Usa fallback se API não responder
            await this.loadPatentesChartFallback();
            await this.loadAssiduidadeChartFallback();
        }
    }

    async loadPatentesChartReal() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/patentes`);
            if (!response.ok) throw new Error('API não respondeu');
            
            const data = await response.json();
            console.log('✅ Dados de patentes:', data);
            
            if (!data || Object.keys(data).length === 0) {
                throw new Error('Sem dados de patentes');
            }
            
            this.createPatentesChart(data);
            
        } catch (error) {
            console.error('❌ Erro patentes real:', error);
            throw error; // Propaga para usar fallback
        }
    }

    async loadAssiduidadeChartReal() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/assiduidade`);
            if (!response.ok) throw new Error('API não respondeu');
            
            const data = await response.json();
            console.log('✅ Dados de assiduidade:', data);
            
            if (!data || data.length === 0) {
                throw new Error('Sem dados de assiduidade');
            }
            
            this.createAssiduidadeChart(data);
            
        } catch (error) {
            console.error('❌ Erro assiduidade real:', error);
            throw error;
        }
    }

    async loadPatentesChartFallback() {
        try {
            // Busca jogadores do banco para calcular
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            
            const distribuição = {
                'Cabo 🪖': 0,
                'Soldado 🛡️': 0,
                'Tenente ⚔️': 0,
                'Capitão 👮': 0,
                'Major 💪': 0,
                'Coronel 🎖️': 0,
                'General ⭐': 0,
                'Marechal 🏆': 0
            };
            
            jogadores.forEach(jogador => {
                const patente = jogador.patente || 'Cabo 🪖';
                distribuição[patente] = (distribuição[patente] || 0) + 1;
            });
            
            console.log('📊 Patentes (fallback):', distribuição);
            this.createPatentesChart(distribuição);
            
        } catch (error) {
            console.error('❌ Erro no fallback de patentes:', error);
            // Fallback mais básico
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

    async loadAssiduidadeChartFallback() {
        try {
            // Busca dados reais
            const [jogadores, partidas] = await Promise.all([
                fetch(`${this.apiBase}/jogadores`).then(r => r.json()),
                fetch(`${this.apiBase}/partidas`).then(r => r.json())
            ]);
            
            const assiduidade = jogadores.map(jogador => {
                let partidasJogador = 0;
                
                partidas.forEach(partida => {
                    if (partida.participantes && 
                        partida.participantes.includes(jogador.id.toString())) {
                        partidasJogador++;
                    }
                });
                
                return {
                    apelido: jogador.apelido,
                    partidas: partidasJogador
                };
            })
            .filter(j => j.partidas > 0)
            .sort((a, b) => b.partidas - a.partidas)
            .slice(0, 8);
            
            console.log('📊 Assiduidade (fallback):', assiduidade);
            
            if (assiduidade.length > 0) {
                this.createAssiduidadeChart(assiduidade);
            } else {
                this.createAssiduidadeChart([
                    { apelido: 'Sem dados', partidas: 0 }
                ]);
            }
            
        } catch (error) {
            console.error('❌ Erro no fallback de assiduidade:', error);
            this.createAssiduidadeChart([
                { apelido: 'Dados em carregamento', partidas: 0 }
            ]);
        }
    }

    async loadRankingPerformance() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/performance`);
            if (!response.ok) {
                throw new Error('API não respondeu');
            }
            
            const ranking = await response.json();
            console.log('✅ Ranking performance:', ranking);
            
            const tbody = document.querySelector('#ranking-performance tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            if (!ranking || ranking.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-data-message">
                            <i class="fas fa-info-circle"></i>
                            Mínimo 3 partidas para calcular performance
                        </td>
                    </tr>
                `;
                return;
            }
            
            ranking.forEach((jogador, index) => {
                // CORREÇÃO: Usar campo correto
                const performance = jogador.performance || jogador.percentual || 0;
                const nivel = this.getNivelPerformance(parseFloat(performance));
                
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
                        <span class="performance-score ${this.getPerformanceClass(performance)}">
                            ${performance}%
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
            // Mostra mensagem amigável
            const tbody = document.querySelector('#ranking-performance tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-data-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            Erro ao carregar ranking de performance
                        </td>
                    </tr>
                `;
            }
        }
    }

    // ... (outros métodos permanecem iguais)
    
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
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Dashboard Corrigido...');
    window.dashboard = new DashboardCorrigido();
});
