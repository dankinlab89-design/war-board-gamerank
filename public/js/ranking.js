// ranking.js - Funcionalidades específicas da página de ranking
class RankingPage {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        console.log('🎯 Inicializando página de ranking...');
        await this.loadAllRankings();
        this.setupEventListeners();
        this.updateTimestamp();
    }

    async loadAllRankings() {
        try {
            console.log('🔄 Carregando rankings...');
            
            await Promise.all([
                this.loadRankingGlobal(),
                this.loadRankingMensal(),
                this.loadRankingPerformance()
            ]);
            
            console.log('✅ Rankings carregados');
            
        } catch (error) {
            console.error('❌ Erro ao carregar rankings:', error);
            this.showError('Erro ao carregar rankings');
        }
    }

    async loadRankingGlobal() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/global`);
            const ranking = await response.json();
            
            this.renderRankingGlobal(ranking);
            
        } catch (error) {
            console.error('❌ Erro ranking global:', error);
            this.showTableError('ranking-global', 'Erro ao carregar ranking global');
        }
    }

    async loadRankingMensal() {
        try {
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = hoje.getMonth() + 1;
            
            const response = await fetch(`${this.apiBase}/ranking/mensal/${ano}/${mes}`);
            const ranking = await response.json();
            
            this.renderRankingMensal(ranking);
            
        } catch (error) {
            console.error('❌ Erro ranking mensal:', error);
            this.showTableError('ranking-mensal', 'Erro ao carregar ranking mensal');
        }
    }

    async loadRankingPerformance() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/performance`);
            const ranking = await response.json();
            
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
            tbody.innerHTML = this.createEmptyRow(7, 'Nenhum dado disponível');
            return;
        }
        
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
        // Export buttons
        this.setupExportButtons();
        
        // Auto-refresh
        setInterval(() => {
            this.loadAllRankings();
            this.updateTimestamp();
        }, 30000);
    }

    setupExportButtons() {
        document.getElementById('export-ranking-global')?.addEventListener('click', () => {
            this.exportRanking('global', 'ranking-global.csv');
        });
        
        document.getElementById('export-ranking-mensal')?.addEventListener('click', () => {
            this.exportRanking('mensal', 'ranking-mensal.csv');
        });
        
        document.getElementById('export-ranking-performance')?.addEventListener('click', () => {
            this.exportRanking('performance', 'ranking-performance.csv');
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
            
            // Baixar
            this.downloadFile(csv, filename, 'text/csv');
            
            this.showNotification('✅ Ranking exportado!', 'success');
            
        } catch (error) {
            console.error('❌ Erro exportação:', error);
            this.showNotification('❌ Erro ao exportar', 'error');
        }
    }

    // Métodos auxiliares (mesmos do dashboard)
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
                <td colspan="${colspan}" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                    <i class="fas fa-info-circle"></i> ${message}
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
        alert(message); // Simplificado
    }

    showError(message) {
        console.error(message);
    }

    updateTimestamp() {
        try {
            const now = new Date();
            const timeString = now.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const updateElement = document.getElementById('ranking-update-time');
            if (updateElement) {
                updateElement.textContent = timeString;
            }
        } catch (error) {
            console.error('Erro timestamp:', error);
        }
    }
}

// Inicializar
if (document.querySelector('#ranking-global')) {
    console.log('🎯 Página de ranking detectada');
    document.addEventListener('DOMContentLoaded', () => {
        window.rankingPage = new RankingPage();
    });
}
