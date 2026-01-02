// jogadores-funcional.js - Carregar lista de jogadores (CORRIGIDO)
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Carregando jogadores...');
    
    try {
        const response = await fetch('/api/jogadores');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos da API:', data);
        
        if (data.success) {
            renderizarJogadores(data);
        } else {
            mostrarErro('Erro na API: ' + (data.error || 'Desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        mostrarErro('Erro de conexão: ' + error.message);
    }
});

function renderizarJogadores(data) {
    const tbody = document.getElementById('lista-jogadores');
    if (!tbody) {
        console.error('Elemento #lista-jogadores não encontrado');
        mostrarErro('Elemento de tabela não encontrado no HTML');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Verificar se data já é o array ou se está dentro de data.jogadores
    let jogadores = data;
    if (data.jogadores && Array.isArray(data.jogadores)) {
        jogadores = data.jogadores;
        console.log('Jogadores extraídos de data.jogadores:', jogadores.length);
    } else if (!Array.isArray(data)) {
        console.error('Formato de dados inválido:', data);
        mostrarErro('Formato de dados inválido recebido da API');
        return;
    }
    
    console.log('Jogadores para renderizar:', jogadores.length);
    
    if (jogadores.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    Nenhum jogador cadastrado
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordenar por vitórias (descendente)
    jogadores.sort((a, b) => (b.vitorias || 0) - (a.vitorias || 0));
    
    jogadores.forEach((jogador, index) => {
        const percentual = jogador.partidas > 0 ? 
            ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f0f0f0'};
                        color: ${index < 3 ? '#000' : '#666'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 0.9rem;
                    ">
                        ${index + 1}
                    </div>
                    <strong>${jogador.apelido}</strong>
                </div>
            </td>
            <td>${jogador.nome}</td>
            <td>
                <span class="patente-badge" style="
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 12px;
                    background: rgba(0, 123, 255, 0.1);
                    color: #007bff;
                    border: 1px solid rgba(0, 123, 255, 0.3);
                    font-size: 0.85rem;
                    font-weight: 600;
                ">
                    ${jogador.patente || 'Cabo 🪖'}
                </span>
            </td>
            <td style="color: #28a745; font-weight: bold;">${jogador.vitorias || 0}</td>
            <td>${jogador.partidas || 0}</td>
            <td>
                <span style="
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    ${percentual >= 50 ? 
                        'background: rgba(40, 167, 69, 0.1); color: #28a745; border: 1px solid rgba(40, 167, 69, 0.3);' : 
                        percentual > 0 ?
                        'background: rgba(255, 193, 7, 0.1); color: #ffc107; border: 1px solid rgba(255, 193, 7, 0.3);' :
                        'background: rgba(108, 117, 125, 0.1); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.3);'
                    }
                ">
                    ${percentual}%
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button onclick="editarJogador('${jogador._id}')" 
                            style="padding: 5px 10px; background: #ffc107; color: #000; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="desativarJogador('${jogador._id}', '${jogador.apelido}')" 
                            style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-trash"></i> Desativar
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('Tabela de jogadores renderizada com sucesso!');
}

// Funções para os botões (adicionar no final do arquivo)
window.editarJogador = function(id) {
    alert(`Editar jogador ID: ${id}\n(Implementar modal de edição)`);
    // Aqui vamos abrir um modal com formulário de edição
};

window.desativarJogador = function(id, apelido) {
    if (confirm(`Tem certeza que deseja desativar o jogador "${apelido}"?\n\nEle não aparecerá mais no ranking, mas os dados serão mantidos.`)) {
        alert(`Desativar jogador ID: ${id}\n(Implementar chamada API)`);
        // Aqui vamos chamar DELETE /api/jogadores/:id
    }
};
// MODAL DE EDIÇÃO
function criarModalEdicao() {
    // Remover modal anterior se existir
    const modalAnterior = document.getElementById('modal-editar-jogador');
    if (modalAnterior) modalAnterior.remove();
    
    const modalHTML = `
        <div id="modal-editar-jogador" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        ">
            <div style="
                background: #1a1a2e;
                padding: 30px;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                border: 2px solid #4dabf7;
            ">
                <h2 style="margin-top: 0; color: white;">
                    <i class="fas fa-edit"></i> Editar Jogador
                </h2>
                
                <form id="form-editar-jogador">
                    <input type="hidden" id="editar-id">
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: white;">Nome</label>
                        <input type="text" id="editar-nome" style="width: 100%; padding: 10px; border-radius: 5px;" required>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: white;">Apelido</label>
                        <input type="text" id="editar-apelido" style="width: 100%; padding: 10px; border-radius: 5px;" required>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: white;">E-mail</label>
                        <input type="email" id="editar-email" style="width: 100%; padding: 10px; border-radius: 5px;">
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; color: white;">Observações</label>
                        <textarea id="editar-observacoes" style="width: 100%; padding: 10px; border-radius: 5px; height: 80px;"></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="fecharModal()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button type="submit" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-save"></i> Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar formulário
    document.getElementById('form-editar-jogador').addEventListener('submit', salvarEdicaoJogador);
}

// Função para abrir modal com dados do jogador
window.editarJogador = async function(id) {
    criarModalEdicao();
    
    try {
        // Buscar dados do jogador
        const response = await fetch(`/api/jogadores/${id}`);
        const result = await response.json();
        
        if (result.success) {
            const jogador = result.jogador;
            
            // Preencher formulário
            document.getElementById('editar-id').value = jogador._id;
            document.getElementById('editar-nome').value = jogador.nome;
            document.getElementById('editar-apelido').value = jogador.apelido;
            document.getElementById('editar-email').value = jogador.email || '';
            document.getElementById('editar-observacoes').value = jogador.observacoes || '';
            
            // Mostrar modal
            document.getElementById('modal-editar-jogador').style.display = 'flex';
        } else {
            alert('Erro ao carregar dados do jogador: ' + result.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro de conexão ao carregar dados');
    }
};

// Função para salvar edição
async function salvarEdicaoJogador(e) {
    e.preventDefault();
    
    const id = document.getElementById('editar-id').value;
    const dados = {
        nome: document.getElementById('editar-nome').value.trim(),
        apelido: document.getElementById('editar-apelido').value.trim(),
        email: document.getElementById('editar-email').value.trim() || '',
        observacoes: document.getElementById('editar-observacoes').value.trim() || ''
    };
    
    if (!dados.nome || !dados.apelido) {
        alert('Nome e apelido são obrigatórios!');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;
    
    try {
        const response = await fetch(`/api/jogadores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Jogador atualizado com sucesso!');
            fecharModal();
            // Recarregar lista
            location.reload();
        } else {
            alert('❌ Erro: ' + result.error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro de conexão');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Função para desativar jogador
window.desativarJogador = async function(id, apelido) {
    if (confirm(`Tem certeza que deseja DESATIVAR o jogador "${apelido}"?\n\nEle não aparecerá mais nas listas, mas os dados históricos serão mantidos.`)) {
        try {
            const response = await fetch(`/api/jogadores/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Jogador desativado com sucesso!');
                // Recarregar lista
                location.reload();
            } else {
                alert('❌ Erro: ' + result.error);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('❌ Erro de conexão');
        }
    }
};

// Função para fechar modal
window.fecharModal = function() {
    const modal = document.getElementById('modal-editar-jogador');
    if (modal) modal.style.display = 'none';
};

// Fechar modal ao clicar fora
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modal-editar-jogador');
    if (modal && e.target === modal) {
        fecharModal();
    }
});
