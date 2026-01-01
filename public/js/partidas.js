// partidas.js - Gerenciamento de partidas

class PartidasManager {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.carregarPartidas();
    }

    async carregarPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const partidas = await response.json();
            
            this.renderizarPartidas(partidas);
        } catch (error) {
            console.error('Erro ao carregar partidas:', error);
            this.mostrarErro('Erro ao carregar histórico de batalhas');
        }
    }

    renderizarPartidas(partidas) {
        const tbody = document.getElementById('lista-partidas');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        partidas.forEach(partida => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatarData(partida.data)}</td>
                <td>
                    <span class="badge ${this.getBadgeClass(partida.tipo)}">
                        ${partida.tipo}
                    </span>
                </td>
                <td>
                    <strong style="color: #10b981;">
                        ${partida.vencedor_nome || partida.vencedor_id}
                    </strong>
                </td>
                <td>${this.formatarParticipantes(partida.participantes)}</td>
                <td>${partida.observacoes || '-'}</td>
            `;
            tbody.appendChild(row);
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

    formatarData(dataString) {
        if (!dataString) return '-';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR');
    }

    formatarParticipantes(participantes) {
        if (!participantes) return '-';
        const count = participantes.split(',').length;
        return `${count} jogador(es)`;
    }

    mostrarErro(mensagem) {
        const tbody = document.getElementById('lista-partidas');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i> ${mensagem}
                    </td>
                </tr>
            `;
        }
    }
}

// Inicializar quando a página carregar
if (document.getElementById('lista-partidas')) {
    new PartidasManager();
}