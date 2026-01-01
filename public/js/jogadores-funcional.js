// jogadores-funcional.js - Sistema completo de gerenciamento de jogadores
class JogadoresManager {
    constructor() {
        this.apiBase = '/api';
        this.currentJogadorId = null;
        this.init();
    }

    async init() {
        await this.carregarJogadores();
        this.setupEventListeners();
        this.setupModals();
    }

    async carregarJogadores() {
        try {
            console.log('🔄 Carregando jogadores...');
            
            const response = await fetch(`${this.apiBase}/jogadores`);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            const jogadores = await response.json();
            console.log(`✅ ${jogadores.length} jogadores carregados`);
            
            this.renderizarJogadores(jogadores);
        } catch (error) {
            console.error('❌ Erro ao carregar jogadores:', error);
            this.mostrarMensagem('Erro ao carregar lista de jogadores', 'error');
        }
    }

    renderizarJogadores(jogadores) {
        const tbody = document.getElementById('lista-jogadores');
        if (!tbody) {
            console.error('❌ Elemento lista-jogadores não encontrado');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (jogadores.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="message message-info">
                            <i class="fas fa-info-circle"></i>
                            Nenhum jogador cadastrado ainda.
                            <a href="cadastro.html" style="color: var(--secondary); text-decoration: underline; margin-left: 10px;">
                                Cadastrar primeiro jogador
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        jogadores.forEach(jogador => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${jogador.nome || ''}</td>
                <td><strong>${jogador.apelido || ''}</strong></td>
                <td>
                    <span class="patente-badge ${this.getPatenteClass(jogador.patente)}">
                        ${jogador.patente || 'Cabo 🪖'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${jogador.status === 'Ativo' ? 'status-ativo' : 'status-inativo'}">
                        ${jogador.status || 'Ativo'}
                    </span>
                </td>
                <td>${this.formatarData(jogador.data_cadastro)}</td>
                <td class="acoes-cell">
                    <button class="btn-action btn-editar" data-id="${jogador.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action ${jogador.status === 'Ativo' ? 'btn-desativar' : 'btn-ativar'}" 
                            data-id="${jogador.id}"
                            data-apelido="${jogador.apelido}"
                            title="${jogador.status === 'Ativo' ? 'Desativar' : 'Ativar'}">
                        <i class="fas ${jogador.status === 'Ativo' ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Reconfigurar eventos após renderizar
        this.setupRowEventListeners();
    }

    setupRowEventListeners() {
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
                const apelido = e.currentTarget.dataset.apelido;
                const statusAtual = e.currentTarget.classList.contains('btn-desativar') ? 'Ativo' : 'Inativo';
                
                this.confirmarAlterarStatus(id, apelido, statusAtual);
            });
        });
    }

    setupModals() {
        // Fechar modais ao clicar no X
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.fecharTodosModais();
            });
        });
        
        // Fechar modal ao clicar fora
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Formulário de edição
        const formEditar = document.getElementById('form-editar');
        if (formEditar) {
            formEditar.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.salvarEdicao();
            });
        }
        
        // Botão confirmar ação
        const btnConfirmar = document.getElementById('btn-confirmar');
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', async () => {
                const action = btnConfirmar.dataset.action;
                const id = btnConfirmar.dataset.id;
                
                if (action === 'toggle-status') {
                    await this.toggleStatusJogador(id);
                }
                
                this.fecharModal('modal-confirmar');
            });
        }
    }

    setupEventListeners() {
        // Menu mobile
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                document.querySelector('.nav-menu')?.classList.toggle('active');
            });
        }
    }

    async abrirModalEditar(id) {
        try {
            console.log(`📝 Carregando dados do jogador ${id}...`);
            
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            const jogador = jogadores.find(j => j.id == id);
            
            if (!jogador) {
                this.mostrarMensagem('Jogador não encontrado', 'error');
                return;
            }
            
            // Preencher formulário
            document.getElementById('editar-id').value = jogador.id;
            document.getElementById('editar-nome').value = jogador.nome || '';
            document.getElementById('editar-apelido').value = jogador.apelido || '';
            document.getElementById('editar-email').value = jogador.email || '';
            document.getElementById('editar-patente').value = jogador.patente || 'Cabo 🪖';
            document.getElementById('editar-status').value = jogador.status || 'Ativo';
            document.getElementById('editar-observacoes').value = jogador.observacoes || '';
            
            // Abrir modal
            this.abrirModal('modal-editar');
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.mostrarMensagem('Erro ao carregar dados do jogador', 'error');
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
        
        if (!dados.nome || !dados.apelido) {
            this.mostrarMensagem('Nome e apelido são obrigatórios', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/jogadores/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.mostrarMensagem('✅ Jogador atualizado com sucesso!', 'success');
                this.fecharModal('modal-editar');
                await this.carregarJogadores();
            } else {
                this.mostrarMensagem(`Erro: ${result.error || 'Falha na atualização'}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
            this.mostrarMensagem('Erro de conexão com o servidor', 'error');
        }
    }

    confirmarAlterarStatus(id, apelido, statusAtual) {
        const novaStatus = statusAtual === 'Ativo' ? 'Inativo' : 'Ativo';
        const acao = statusAtual === 'Ativo' ? 'desativar' : 'ativar';
        
        document.getElementById('confirmar-mensagem').textContent = 
            `Tem certeza que deseja ${acao} o jogador "${apelido}"?`;
        
        document.getElementById('btn-confirmar').dataset.action = 'toggle-status';
        document.getElementById('btn-confirmar').dataset.id = id;
        
        this.abrirModal('modal-confirmar');
    }

    async toggleStatusJogador(id) {
        try {
            // Primeiro buscar o jogador para saber o status atual
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            const jogador = jogadores.find(j => j.id == id);
            
            if (!jogador) {
                this.mostrarMensagem('Jogador não encontrado', 'error');
                return;
            }
            
            const novoStatus = jogador.status === 'Ativo' ? 'Inativo' : 'Ativo';
            
            const updateResponse = await fetch(`${this.apiBase}/jogadores/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });
            
            if (updateResponse.ok) {
                this.mostrarMensagem(`✅ Jogador ${novoStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                await this.carregarJogadores();
            } else {
                const result = await updateResponse.json();
                this.mostrarMensagem(`Erro: ${result.error || 'Falha na alteração'}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Erro ao alterar status:', error);
            this.mostrarMensagem('Erro de conexão', 'error');
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

    formatarData(dataString) {
        if (!dataString) return '-';
        try {
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR');
        } catch (e) {
            return dataString;
        }
    }

    abrirModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    fecharModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    fecharTodosModais() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    mostrarMensagem(texto, tipo = 'info') {
        // Criar ou usar elemento existente para mensagens
        let mensagemDiv = document.getElementById('mensagem-global');
        
        if (!mensagemDiv) {
            mensagemDiv = document.createElement('div');
            mensagemDiv.id = 'mensagem-global';
            mensagemDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                min-width: 300px;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(mensagemDiv);
        }
        
        // Cores por tipo
        const cores = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        mensagemDiv.style.backgroundColor = cores[tipo] || '#17a2b8';
        mensagemDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${texto}</span>
            </div>
        `;
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (mensagemDiv) {
                mensagemDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (mensagemDiv && mensagemDiv.parentNode) {
                        mensagemDiv.parentNode.removeChild(mensagemDiv);
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Inicializar quando a página carregar
if (document.getElementById('lista-jogadores')) {
    window.jogadoresManager = new JogadoresManager();
}

// Adicionar estilos CSS dinâmicos
const styles = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .status-ativo {
        background: rgba(40, 167, 69, 0.2);
        color: #28a745;
        border: 1px solid rgba(40, 167, 69, 0.3);
    }
    
    .status-inativo {
        background: rgba(220, 53, 69, 0.2);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.3);
    }
    
    .btn-action {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        margin: 0 5px;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .btn-action:hover {
        background: rgba(184, 134, 11, 0.3);
        border-color: var(--secondary);
        transform: translateY(-2px);
    }
    
    .btn-desativar:hover {
        background: rgba(220, 53, 69, 0.3);
        border-color: #dc3545;
    }
    
    .btn-ativar:hover {
        background: rgba(40, 167, 69, 0.3);
        border-color: #28a745;
    }
    
    .acoes-cell {
        display: flex;
        gap: 10px;
        justify-content: center;
    }
    
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 1000;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .modal-content {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 15px;
        padding: 30px;
        width: 90%;
        max-width: 500px;
        border: 2px solid var(--secondary);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .modal-header h3 {
        color: var(--secondary);
        margin: 0;
        font-size: 1.3rem;
    }
    
    .modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 5px;
        line-height: 1;
    }
    
    .modal-close:hover {
        color: var(--secondary);
    }
    
    .modal-body {
        padding: 20px 0;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
