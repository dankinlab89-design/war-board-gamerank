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
