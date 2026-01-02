// cadastro-funcional.js - Formulário de cadastro de jogadores
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página de cadastro carregada');
    
    // Configurar data atual
    const dataInput = document.getElementById('data-cadastro');
    if (dataInput) {
        const hoje = new Date().toISOString().split('T')[0];
        dataInput.value = hoje;
        dataInput.disabled = true;
    }
    
    // Configurar formulário
    const form = document.getElementById('form-cadastro-jogador');
    if (form) {
        form.addEventListener('submit', cadastrarJogador);
        console.log('Formulário configurado');
    } else {
        console.error('Formulário #form-cadastro-jogador não encontrado');
        mostrarErro('Formulário não encontrado na página');
    }
});

async function cadastrarJogador(event) {
    event.preventDefault();
    console.log('Tentando cadastrar jogador...');
    
    // Coletar dados do formulário - PATENTE SEMPRE "Cabo 🪖"
    const formData = {
        nome: document.getElementById('nome')?.value.trim(),
        apelido: document.getElementById('apelido')?.value.trim(),
        email: document.getElementById('email')?.value.trim() || '',
        patente: 'Cabo 🪖', // ← SEMPRE CABO PARA NOVOS JOGADORES
        observacoes: document.getElementById('observacoes')?.value.trim() || ''
    };
    
    console.log('Dados a cadastrar:', formData);
    
    // Validação
    if (!formData.nome) {
        mostrarMensagem('Nome é obrigatório', 'error');
        document.getElementById('nome').focus();
        return;
    }
    
    if (!formData.apelido) {
        mostrarMensagem('Apelido é obrigatório', 'error');
        document.getElementById('apelido').focus();
        return;
    }
    
    // Mostrar loading
    const submitBtn = document.querySelector('#form-cadastro-jogador button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/jogadores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            mostrarMensagem(`✅ ${formData.apelido} cadastrado com sucesso!`, 'success');
            
            // Limpar formulário
            document.getElementById('form-cadastro-jogador').reset();
            
            // Restaurar data atual
            const dataInput = document.getElementById('data-cadastro');
            if (dataInput) {
                const hoje = new Date().toISOString().split('T')[0];
                dataInput.value = hoje;
            }
            
            // Redirecionar após 3 segundos
            setTimeout(() => {
                window.location.href = '/jogadores';
            }, 3000);
            
        } else {
            mostrarMensagem(`❌ Erro: ${result.error || 'Falha no cadastro'}`, 'error');
        }
        
    } catch (error) {
        console.error('Erro no cadastro:', error);
        mostrarMensagem('❌ Erro de conexão com o servidor', 'error');
    } finally {
        // Restaurar botão
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function mostrarMensagem(mensagem, tipo = 'info') {
    // Remover mensagens anteriores
    const mensagensAntigas = document.querySelectorAll('.mensagem-flutuante');
    mensagensAntigas.forEach(el => el.remove());
    
    const mensagemDiv = document.createElement('div');
    mensagemDiv.className = `mensagem-flutuante mensagem-${tipo}`;
    mensagemDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: ${tipo === 'success' ? '#155724' : tipo === 'error' ? '#721c24' : '#856404'};
        background: ${tipo === 'success' ? '#d4edda' : tipo === 'error' ? '#f8d7da' : '#fff3cd'};
        border: 1px solid ${tipo === 'success' ? '#c3e6cb' : tipo === 'error' ? '#f5c6cb' : '#ffeaa7'};
        z-index: 1000;
        font-family: Arial, sans-serif;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    const icone = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';
    mensagemDiv.innerHTML = `
        <span style="font-size: 1.2rem;">${icone}</span>
        <span>${mensagem}</span>
    `;
    
    document.body.appendChild(mensagemDiv);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        mensagemDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => mensagemDiv.remove(), 300);
    }, 5000);
    
    // Adicionar animações CSS se não existirem
    if (!document.querySelector('#animacoes-mensagens')) {
        const style = document.createElement('style');
        style.id = 'animacoes-mensagens';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function mostrarErro(mensagem) {
    const container = document.querySelector('.container') || document.body;
    
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 15px;
        margin: 20px 0;
        border-radius: 5px;
        font-family: Arial, sans-serif;
    `;
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">⚠️</span>
            <div>
                <strong style="display: block; margin-bottom: 5px;">Atenção</strong>
                ${mensagem}
            </div>
        </div>
    `;
    
    if (container.querySelector('h1')) {
        container.querySelector('h1').after(errorDiv);
    } else {
        container.prepend(errorDiv);
    }
}

// Testar conexão com API
async function testarConexao() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('Conexão API:', data.status);
        return data.status === 'online';
    } catch (error) {
        console.error('API offline:', error);
        return false;
    }
}

// Verificar conexão ao carregar
testarConexao().then(online => {
    if (!online) {
        mostrarMensagem('⚠️ Servidor offline. Cadastro não disponível.', 'error');
    }
});
