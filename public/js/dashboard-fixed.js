// dashboard-fixed.js - Versão corrigida
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
            await Promise.all([
                this.loadEstatisticas(),
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance(),
                this.loadVencedoresMensais(this.currentYear),
                this.loadUltimasPartidas(),
                this.loadChartData() // Agora com dados reais
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }

    async loadChartData() {
        try {
            // Carregar dados reais para gráficos
            await this.loadPatentesChartReal();
            await this.loadAssiduidadeChartReal();
        } catch (error) {
            console.error('Erro ao carregar dados dos gráficos:', error);
            this.createPatentesChartFallback();
            this.createAssiduidadeChartFallback();
        }
    }

    async loadPatentesChartReal() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/patentes`);
            const data = await response.json();
            
            // Verificar se temos dados
            if (!data || Object.keys(data).length === 0) {
                throw new Error('Sem dados de patentes');
            }
            
            this.createPatentesChart(data);
        } catch (error) {
            console.error('Erro ao carregar patentes:', error);
            this.createPatentesChartFallback();
        }
    }

    async loadAssiduidadeChartReal() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas/assiduidade`);
            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error('Sem dados de assiduidade');
            }
            
            this.createAssiduidadeChart(data);
        } catch (error) {
            console.error('Erro ao carregar assiduidade:', error);
            this.createAssiduidadeChartFallback();
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
                // Corrigir: usar o campo correto para performance
                const performance = jogador.performance || jogador.percentual || 0;
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
            console.error('Erro ao carregar ranking performance:', error);
        }
    }

    // Métodos para gráficos com fallback
    createPatentesChartFallback() {
        const ctx = document.getElementById('chart-patentes');
        if (!ctx) return;
        
        // Buscar jogadores para calcular distribuição real
        fetch(`${this.apiBase}/jogadores`)
            .then(response => response.json())
            .then(jogadores => {
                // Calcular distribuição
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
                
                this.createPatentesChart(distribuição);
            })
            .catch(() => {
                // Fallback mais básico
                this.createPatentesChart({
                    'Cabo 🪖': jogadores ? jogadores.length : 1,
                    'Soldado 🛡️': 0,
                    'Tenente ⚔️': 0,
                    'Capitão 👮': 0,
                    'Major 💪': 0,
                    'Coronel 🎖️': 0,
                    'General ⭐': 0,
                    'Marechal 🏆': 0
                });
            });
    }

    createAssiduidadeChartFallback() {
        // Buscar dados reais de partidas por jogador
        Promise.all([
            fetch(`${this.apiBase}/jogadores`).then(r => r.json()),
            fetch(`${this.apiBase}/partidas`).then(r => r.json())
        ]).then(([jogadores, partidas]) => {
            const assiduidade = jogadores.map(jogador => {
                const partidasJogador = partidas.filter(p => 
                    p.participantes && p.participantes.includes(jogador.id.toString())
                ).length;
                
                return {
                    apelido: jogador.apelido,
                    partidas: partidasJogador
                };
            })
            .filter(j => j.partidas > 0)
            .sort((a, b) => b.partidas - a.partidas)
            .slice(0, 8);
            
            this.createAssiduidadeChart(assiduidade);
        });
    }

    // ... (manter os outros métodos existentes)
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new DashboardCorrigido();
});
