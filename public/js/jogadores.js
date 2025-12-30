// jogadores.js - Gerenciamento de jogadores

class JogadoresManager {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.carregarJogadores();
    }

    async carregarJogadores() {
        try {
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            
            this.renderizarJogadores(jogadores);
        } catch (error) {
            console.error('Erro ao carregar jogadores:', error);
            this.mostrarErro('Erro ao carregar lista de tropas');
        }
    }

    renderizarJogadores(jogadores) {
        const tbody = document.getElementById('lista-jogadores');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        jogadores.forEach(jogador => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${jogador.nome}</td>
                <td><strong>${jogador.apelido}</strong></td>
                <td>
                    <span class="patente-badge ${this.getPatenteClass(jogador.patente)}">
                        ${jogador.patente}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${jogador.status === 'Ativo' ? 'ativo' : 'inativo'}">
                        ${jogador.status}
                    </span>
                </td>
                <td>${this.formatarData(jogador.data_cadastro)}</td>
                <td>
                    <button class="btn-action" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-danger" title="Desativar">
                        <i class="fas fa-user-slash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    getPatenteClass(patente) {
        const classes = {
            'Cabo 🪖': 'patente-cabo',
            'Soldado 🛡️': 'patente-soldado',
            'Tenente ⚔️': 'patente-tenente',
            'Capitão 👮': 'patente-capitao',
            'Major 💪': 'patente-major',
            'Coronel 🎖️': 'patente-coronel',
            'General ⭐': 'patente-general',
            'Marechal 🏆': 'patente-marechal'
        };
        return classes[patente] || 'patente-cabo';
    }

    formatarData(dataString) {
        if (!dataString) return '-';
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR');
    }

    mostrarErro(mensagem) {
        const tbody = document.getElementById('lista-jogadores');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i> ${mensagem}
                    </td>
                </tr>
            `;
        }
    }
}

// Inicializar quando a página carregar
if (document.getElementById('lista-jogadores')) {
    new JogadoresManager();
}