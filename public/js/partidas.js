// partidas.js - Gerenciamento completo de partidas com edição/exclusão
class PartidasManager {
    constructor() {
        this.apiBase = '/api';
        this.partidas = [];
        this.init();
    }

    async init() {
        await this.carregarPartidas();
        this.adicionarEventListeners();
    }

    async carregarPartidas() {
        try {
            const response = await fetch(`${this.apiBase}/partidas`);
            const data = await response.json();
            
            if (data.success) {
                this.partidas = data.partidas || [];
                this.renderizarPartidas(this.partidas);
            } else {
                this.mostrarErro('Erro ao carregar partidas: ' + (data.error || 'Desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao carregar partidas:', error);
            this.mostrarErro('Erro ao carregar histórico de batalhas');
        }
    }

    renderizarPartidas(partidas) {
        const tbody = document.getElementById('lista-partidas');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (partidas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        Nenhuma partida registrada ainda
                    </td>
                </tr>
            `;
            return;
        }
        
        // Ordenar por data (mais recente primeiro)
        partidas.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        partidas.forEach(partida => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.formatarData(partida.data)}</td>
                <td>
                    <span class="badge ${this.getBadgeClass(partida.tipo)}">
                        ${partida.tipo || 'global'}
                    </span>
                </td>
                <td>
                    <strong style="color: #10b981;">
                        ${partida.vencedor}
                    </strong>
                </td>
                <td>${this.formatarParticipantes(partida.participantes)}</td>
                <td>${partida.observacoes || '-'}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-warning btn-editar" data-id="${partida._id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-excluir" data-id="${partida._id}" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Adicionar eventos aos botões
        this.adicionarEventListenersBotoes();
    }

    adicionarEventListeners() {
        // Botão de recarregar
        const btnRecarregar = document.getElementById('btn-recarregar');
        if (btnRecarregar) {
            btnRecarregar.addEventListener('click', () => {
                this.carregarPartidas();
                this.mostrarNotificacao('Partidas recarregadas', 'success');
            });
        }
        
        // Auto-refresh a cada 30 segundos
        setInterval(() => {
            this.carregarPartidas();
        }, 30000);
    }

    adicionarEventListenersBotoes() {
        // Botões de editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const partidaId = e.target.closest('.btn-editar').dataset.id;
                this.editarPartida(partidaId);
            });
        });
        
        // Botões de excluir
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const partidaId = e.target.closest('.btn-excluir').dataset.id;
                this.confirmarExclusao(partidaId);
            });
        });
    }

    async editarPartida(id) {
        try {
            console.log('✏️ Editando partida:', id);
            
            const response = await fetch(`${this.apiBase}/partidas/${id}`);
            const data = await response.json();
            
            if (data.success) {
                this.preencherFormularioEdicao(data.partida);
                this.mostrarModalEdicao();
            } else {
                this.mostrarNotificacao('Erro ao carregar partida para edição', 'error');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar partida para edição:', error);
            this.mostrarNotificacao('Erro ao carregar partida', 'error');
        }
    }

    preencherFormularioEdicao(partida) {
        const modal = document.getElementById('modal-editar-partida');
        if (!modal) {
            this.criarModalEdicao();
        }
        
        // Preencher campos
        document.getElementById('editar-id').value = partida._id;
        document.getElementById('editar-data').value = this.formatarDataParaInput(partida.data);
        document.getElementById('editar-tipo').value = partida.tipo || 'global';
        document.getElementById('editar-vencedor').value = partida.vencedor;
        document.getElementById('editar-observacoes').value = partida.observacoes || '';
        document.getElementById('editar-pontos').value = partida.pontos || 100;
        
        // Para participantes, precisaríamos de um select múltiplo
        // Por enquanto, vamos apenas mostrar
        const participantesDiv = document.getElementById('editar-participantes-info');
        if (participantesDiv) {
            participantesDiv.textContent = Array.isArray(partida.participantes) ? 
                partida.participantes.join(', ') : partida.participantes;
        }
    }

    mostrarModalEdicao() {
        // Se não existe o modal, criar
        if (!document.getElementById('modal-editar-partida')) {
            this.criarModalEdicao();
        }
        
        // Mostrar modal (usando Bootstrap se disponível, ou nativo)
        const modal = document.getElementById('modal-editar-partida');
        modal.style.display = 'block';
    }

    criarModalEdicao() {
        const modalHTML = `
            <div class="modal" id="modal-editar-partida" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fas fa-edit"></i> Editar Partida</h5>
                            <button type="button" class="btn-close btn-close-white" onclick="document.getElementById('modal-editar-partida').style.display='none'"></button>
                        </div>
                        <div class="modal-body">
                            <form id="form-editar-partida">
                                <input type="hidden" id="editar-id">
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editar-data" class="form-label">Data</label>
                                            <input type="datetime-local" class="form-control" id="editar-data" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editar-tipo" class="form-label">Tipo</label>
                                            <select class="form-control" id="editar-tipo" required>
                                                <option value="global">Global 🌎</option>
                                                <option value="campeonato">Campeonato 🏆</option>
                                                <option value="amistosa">Amistosa 🤝</option>
                                                <option value="eliminatoria">Eliminatória ⚔️</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editar-vencedor" class="form-label">Vencedor</label>
                                    <input type="text" class="form-control" id="editar-vencedor" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Participantes</label>
                                    <div id="editar-participantes-info" class="form-control" style="min-height: 60px; background: rgba(255,255,255,0.1);">
                                        (carregando...)
                                    </div>
                                    <small class="text-muted">Para alterar participantes, exclua e crie uma nova partida</small>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="editar-pontos" class="form-label">Pontos</label>
                                            <input type="number" class="form-control" id="editar-pontos" min="50" max="200" value="100" required>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="editar-observacoes" class="form-label">Observações</label>
                                    <textarea class="form-control" id="editar-observacoes" rows="3"></textarea>
                                </div>
                                
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-editar-partida').style.display='none'">
                                        Cancelar
                                    </button>
                                    <button type="submit" class="btn btn-primary">
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Adicionar evento ao formulário
        document.getElementById('form-editar-partida').addEventListener('submit', (e) => {
            e.preventDefault();
            this.atualizarPartida();
        });
    }

    async atualizarPartida() {
        try {
            const partidaId = document.getElementById('editar-id').value;
            
            const dados = {
                data: document.getElementById('editar-data').value,
                tipo: document.getElementById('editar-tipo').value,
                vencedor: document.getElementById('editar-vencedor').value,
                observacoes: document.getElementById('editar-observacoes').value,
                pontos: parseInt(document.getElementById('editar-pontos').value) || 100
            };
            
            const response = await fetch(`${this.apiBase}/partidas/${partidaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.mostrarNotificacao('✅ Partida atualizada com sucesso!', 'success');
                document.getElementById('modal-editar-partida').style.display = 'none';
                this.carregarPartidas(); // Recarregar lista
            } else {
                this.mostrarNotificacao('Erro: ' + (result.error || 'Falha na atualização'), 'error');
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar partida:', error);
            this.mostrarNotificacao('Erro ao atualizar partida', 'error');
        }
    }

    async confirmarExclusao(id) {
        const partida = this.partidas.find(p => p._id === id);
        if (!partida) return;
        
        const confirmacao = confirm(`Tem certeza que deseja excluir a partida?\n\nData: ${this.formatarData(partida.data)}\nVencedor: ${partida.vencedor}\n\n⚠️ Esta ação não pode ser desfeita!`);
        
        if (confirmacao) {
            await this.excluirPartida(id);
        }
    }

    async excluirPartida(id) {
        try {
            const response = await fetch(`${this.apiBase}/partidas/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.mostrarNotificacao('✅ Partida excluída com sucesso!', 'success');
                this.carregarPartidas(); // Recarregar lista
            } else {
                this.mostrarNotificacao('Erro: ' + (result.error || 'Falha na exclusão'), 'error');
            }
            
        } catch (error) {
            console.error('❌ Erro ao excluir partida:', error);
            this.mostrarNotificacao('Erro ao excluir partida', 'error');
        }
    }

    // Métodos auxiliares
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
            return data.toLocaleDateString('pt-BR') + ' ' + 
                   data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return dataString;
        }
    }

    formatarDataParaInput(dataString) {
        if (!dataString) return new Date().toISOString().slice(0, 16);
        try {
            const data = new Date(dataString);
            const offset = data.getTimezoneOffset();
            const adjustedDate = new Date(data.getTime() - (offset * 60000));
            return adjustedDate.toISOString().slice(0, 16);
        } catch (e) {
            return new Date().toISOString().slice(0, 16);
        }
    }

    formatarParticipantes(participantes) {
        if (!participantes) return '-';
        if (Array.isArray(participantes)) {
            return `${participantes.length} jogador(es): ${participantes.slice(0, 3).join(', ')}${participantes.length > 3 ? '...' : ''}`;
        } else if (typeof participantes === 'string') {
            const count = participantes.split(',').length;
            return `${count} jogador(es)`;
        }
        return '-';
    }

    mostrarErro(mensagem) {
        const tbody = document.getElementById('lista-partidas');
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

    mostrarNotificacao(mensagem, tipo = 'success') {
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
            background: ${tipo === 'success' ? '#28a745' : '#dc3545'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-family: 'Montserrat', sans-serif;
        `;
        
        notification.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${mensagem}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Inicializar quando a página carregar
if (document.getElementById('lista-partidas')) {
    document.addEventListener('DOMContentLoaded', () => {
        new PartidasManager();
    });
}
