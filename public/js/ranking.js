// ranking.js - Sistema completo de ranking
class RankingPage {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        console.log('🚀 Iniciando sistema de ranking...');
        await this.loadAllRankings();
        this.setupEventListeners();
        this.setupExportButtons();
    }

    async loadAllRankings() {
        try {
            // Carregar todos os rankings em paralelo
            await Promise.all([
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance()
            ]);
            console.log('✅ Todos os rankings carregados');
        } catch (error) {
            console.error('❌ Erro ao carregar rankings:', error);
            this.showError('Erro ao carregar rankings');
        }
    }

    async loadRankingGlobal() {
        try {
            console.log('🌍 Carregando ranking global...');
            const response = await fetch(`${this.apiBase}/ranking/global`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const ranking = await response.json();
            console.log('✅ Ranking global:', ranking);
            
            this.renderRankingGlobal(ranking);
        } catch (error) {
            console.error('❌ Erro ranking global:', error);
            this.showTableError('ranking-global', 'Erro ao carregar ranking global');
        }
    }

    async loadRankingMensal() {
        try {
            console.log('📅 Carregando ranking mensal...');
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = hoje.getMonth() + 1;
            
            const response = await fetch(`${this.apiBase}/ranking/mensal/${ano}/${mes}`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const ranking = await response.json();
            console.log('✅ Ranking mensal:', ranking);
            
            this.renderRankingMensal(ranking);
        } catch (error) {
            console.error('❌ Erro ranking mensal:', error);
            this.showTableError('ranking-mensal', 'Erro ao carregar ranking mensal');
        }
    }

    async loadRankingPerformance() {
        try {
            console.log('⚡ Carregando ranking performance...');
            const response = await fetch(`${this.apiBase}/ranking/performance`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const ranking = await response.json();
            console.log('✅ Ranking performance:', ranking);
            
            this.renderRankingPerformance(ranking);
        } catch (error) {
            console.error('❌ Erro ranking performance:', error);
            this.showTableError('ranking-performance', 'Erro ao carregar ranking performance');
        }
    }

    renderRankingGlobal(ranking) {
        const tbody = document.querySelector('#ranking-global tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = this.createEmptyRow(7, 'Nenhum dado disponível para ranking global');
            return;
        }
        
        ranking.forEach((jogador, index) => {
            const percentual = jogador.partidas > 0 ? 
                ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0;
            
            // Calcular pontos: 10 pontos por vitória + 2 por partida
            const pontos = (parseInt(jogador.vitorias) * 10) + (parseInt(jogador.partidas) * 2);
            
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
    }

    renderRankingMensal(ranking) {
        const tbody = document.querySelector('#ranking-mensal tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!ranking || ranking.length === 0) {
            const hoje = new Date();
            const mesNome = hoje.toLocaleDateString('pt-BR', { month: 'long' });
            tbody.innerHTML = this.createEmptyRow(6, `Nenhuma partida em ${mesNome}`);
            return;
        }
        
        ranking.forEach((jogador, index) => {
            const percentual = jogador.partidas > 0 ? 
                ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0;
            
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
            `;
            tbody.appendChild(row);
        });
    }

    renderRankingPerformance(ranking) {
        const tbody = document.querySelector('#ranking-performance tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = this.createEmptyRow(7, 'Mínimo 3 partidas para cálculo de performance');
            return;
        }
        
        ranking.forEach((jogador, index) => {
            // IMPORTANTE: API retorna 'percentual', não 'performance'
            const performance = parseFloat(jogador.percentual) || 0;
            const nivel = this.getNivelPerformance(performance);
            
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
    }

    setupEventListeners() {
        // Botões de exportação
        this.setupExportButtons();
        
        // Auto-refresh a cada 30 segundos
        setInterval(() => {
            this.loadAllRankings();
        }, 30000);
    }

    setupExportButtons() {
        // Exportar ranking global
        document.getElementById('export-ranking-global')?.addEventListener('click', async () => {
            await this.exportRanking('global', 'ranking-global.csv');
        });
        
        // Exportar ranking mensal
        document.getElementById('export-ranking-mensal')?.addEventListener('click', async () => {
            await this.exportRanking('mensal', 'ranking-mensal.csv');
        });
        
        // Exportar ranking performance
        document.getElementById('export-ranking-performance')?.addEventListener('click', async () => {
            await this.exportRanking('performance', 'ranking-performance.csv');
        });
    }

    async exportRanking(tipo, filename) {
        try {
            let endpoint;
            switch(tipo) {
                case 'global': endpoint = '/ranking/global'; break;
                case 'mensal': 
                    const hoje = new Date();
                    endpoint = `/ranking/mensal/${hoje.getFullYear()}/${hoje.getMonth() + 1}`;
                    break;
                case 'performance': endpoint = '/ranking/performance'; break;
                default: return;
            }
            
            const response = await fetch(`${this.apiBase}${endpoint}`);
            const data = await response.json();
            
            if (!data || data.length === 0) {
                alert('Nenhum dado para exportar');
                return;
            }
            
            // Criar CSV
            let csv = 'Posição,Apelido,Patente,Vitórias,Partidas,%,Pontos,Nível\n';
            
            data.forEach((item, index) => {
                const percentual = item.partidas > 0 ? 
                    ((item.vitorias / item.partidas) * 100).toFixed(1) : 0;
                const pontos = (parseInt(item.vitorias) * 10) + (parseInt(item.partidas) * 2);
                const nivel = tipo === 'performance' ? this.getNivelPerformance(parseFloat(item.percentual)) : '-';
                
                csv += `${index + 1},"${item.apelido}","${item.patente}",${item.vitorias},${item.partidas},${percentual},${pontos},"${nivel}"\n`;
            });
            
            // Baixar arquivo
            this.downloadCSV(csv, filename);
            
            this.showNotification('✅ Ranking exportado com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao exportar:', error);
            this.showNotification('❌ Erro ao exportar ranking', 'error');
        }
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (navigator.msSaveBlob) {
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

    createEmptyRow(colspan, message) {
        return `
            <tr>
                <td colspan="${colspan}" class="empty-data-message">
                    <i class="fas fa-info-circle"></i>
                    ${message}
                </td>
            </tr>
        `;
    }

    showTableError(tableId, message) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (tbody) {
            tbody.innerHTML = this.createEmptyRow(7, message);
        }
    }

    showNotification(message, type = 'success') {
        // Implementação simples
        alert(message);
    }

    showError(message) {
        console.error(message);
    }
}

// Inicializar quando a página carregar
if (document.querySelector('#ranking-global')) {
    console.log('🎯 Inicializando página de ranking...');
    window.rankingPage = new RankingPage();
}
