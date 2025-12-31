class JogadoresManager {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        await this.carregarJogadores();
        this.setupModals();
    }

    async carregarJogadores() {
        try {
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            this.renderizarJogadores(jogadores);
        } catch (error) {
            console.error('Erro:', error);
            this.mostrarErro('Erro ao carregar jogadores');
        }
    }

    renderizarJogadores(jogadores) {
        const tbody = document.getElementById('lista-jogadores');
        tbody.innerHTML = '';
        
        jogadores.forEach(jogador => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${jogador.nome}</td>
                <td><strong>${jogador.apelido}</strong></td>
                <td><span class="patente-badge ${this.getPatenteClass(jogador.patente)}">${jogador.patente}</span></td>
                <td><span class="status-badge ${jogador.status === 'Ativo' ? 'ativo' : 'inativo'}">${jogador.status}</span></td>
                <td>${this.formatarData(jogador.data_cadastro)}</td>
                <td>
                    <button class="btn-action btn-editar" data-id="${jogador.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action ${jogador.status === 'Ativo' ? 'btn-desativar' : 'btn-ativar'}" 
                            data-id="${jogador.id}" 
                            data-status="${jogador.status}"
                            data-apelido="${jogador.apelido}"
                            title="${jogador.status === 'Ativo' ? 'Desativar' : 'Ativar'}">
                        <i class="fas ${jogador.status === 'Ativo' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botões editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.abrirModalEditar(id);
            });
        });
        
        // Botões ativar/desativar
        document.querySelectorAll('.btn-desativar, .btn-ativar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const status = e.currentTarget.dataset.status;
                const apelido = e.currentTarget.dataset.apelido;
                
                this.confirmarAlterarStatus(id, status, apelido);
            });
        });
    }

    setupModals() {
        // Fechar modais
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            });
        });
        
        // Formulário editar
        document.getElementById('form-editar').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.salvarEdicao();
        });
        
        // Botão confirmar
        document.getElementById('btn-confirmar').addEventListener('click', async () => {
            const action = document.getElementById('btn-confirmar').dataset.action;
            const id = document.getElementById('btn-confirmar').dataset.id;
            
            if (action === 'desativar') {
                await this.alterarStatus(id, 'Inativo');
            } else if (action === 'ativar') {
                await this.alterarStatus(id, 'Ativo');
            }
            
            document.getElementById('modal-confirmar').style.display = 'none';
        });
    }

    async abrirModalEditar(id) {
        try {
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            const jogador = jogadores.find(j => j.id == id);
            
            if (!jogador) {
                alert('Jogador não encontrado');
                return;
            }
            
            // Preencher formulário
            document.getElementById('editar-id').value = jogador.id;
            document.getElementById('editar-nome').value = jogador.nome;
            document.getElementById('editar-apelido').value = jogador.apelido;
            document.getElementById('editar-email').value = jogador.email || '';
            document.getElementById('editar-patente').value = jogador.patente;
            document.getElementById('editar-status').value = jogador.status;
            document.getElementById('editar-observacoes').value = jogador.observacoes || '';
            
            // Abrir modal
            document.getElementById('modal-editar').style.display = 'block';
            
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar dados do jogador');
        }
    }

    async salvarEdicao() {
        const id = document.getElementById('editar-id').value;
        const dados = {
            nome: document.getElementById('editar-nome').value.trim(),
            apelido: document.getElementById('editar-apelido').value.trim(),
            email: document.getElementById('editar-email').value.trim() || null,
            patente: document.getElementById('editar-patente').value,
            status: document.getElementById('editar-status').value,
            observacoes: document.getElementById('editar-observacoes').value.trim() || ''
        };
        
        try {
            const response = await fetch(`${this.apiBase}/admin/jogadores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('✅ Jogador atualizado com sucesso!');
                document.getElementById('modal-editar').style.display = 'none';
                await this.carregarJogadores();
            } else {
                alert('Erro: ' + (result.error || 'Falha na atualização'));
            }
            
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão');
        }
    }

    confirmarAlterarStatus(id, statusAtual, apelido) {
        const novaStatus = statusAtual === 'Ativo' ? 'Inativo' : 'Ativo';
        const acao = statusAtual === 'Ativo' ? 'desativar' : 'ativar';
        
        document.getElementById('confirmar-mensagem').textContent = 
            `Tem certeza que deseja ${acao} o jogador "${apelido}"?`;
        
        document.getElementById('btn-confirmar').dataset.action = acao;
        document.getElementById('btn-confirmar').dataset.id = id;
        
        document.getElementById('modal-confirmar').style.display = 'block';
    }

    async alterarStatus(id, novoStatus) {
        try {
            const response = await fetch(`${this.apiBase}/admin/jogadores/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });
            
            if (response.ok) {
                alert(`✅ Jogador ${novoStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`);
                await this.carregarJogadores();
            } else {
                const result = await response.json();
                alert('Erro: ' + (result.error || 'Falha na alteração'));
            }
            
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão');
        }
    }
    
    // ... (métodos auxiliares)
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new JogadoresManager();
});
