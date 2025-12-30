// main.js - Funcionalidades gerais do sistema WAR

class WARSystem {
    constructor() {
        this.apiBase = '/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
        this.loadInitialData();
    }

    setupEventListeners() {
        // Configurar formulários específicos de cada página
        this.setupPageSpecificForms();
    }

    setupMobileMenu() {
        const toggle = document.querySelector('.nav-toggle');
        const menu = document.querySelector('.nav-menu');
        
        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                menu.classList.toggle('active');
            });
            
            // Fechar menu ao clicar em um link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    menu.classList.remove('active');
                });
            });
        }
    }

    setupPageSpecificForms() {
        // Configurar formulário de cadastro se estiver na página
        this.setupCadastroForm();
        
        // Configurar formulário de partida se estiver na página
        this.setupPartidaForm();
    }

    setupCadastroForm() {
        const form = document.getElementById('form-cadastro');
        if (!form) {
            return; // Não está na página de cadastro
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Coletar dados do formulário
            const nomeInput = document.getElementById('nome');
            const apelidoInput = document.getElementById('apelido');
            const emailInput = document.getElementById('email');
            const observacoesInput = document.getElementById('observacoes');
            const mensagemDiv = document.getElementById('mensagem');
            
            if (!nomeInput || !apelidoInput) {
                console.error('Campos do formulário não encontrados');
                return;
            }
            
            const jogador = {
                nome: nomeInput.value.trim(),
                apelido: apelidoInput.value.trim(),
                email: emailInput ? emailInput.value.trim() : null,
                observacoes: observacoesInput ? observacoesInput.value.trim() : ''
            };
            
            // Validação
            if (!jogador.nome || !jogador.apelido) {
                this.showMessage(mensagemDiv, 'Nome e apelido são obrigatórios!', 'error');
                return;
            }
            
            try {
                const response = await fetch(`${this.apiBase}/jogadores`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(jogador)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    this.showMessage(mensagemDiv, result.mensagem || 'Jogador cadastrado com sucesso!', 'success');
                    form.reset();
                    
                    // Redirecionar após 2 segundos
                    setTimeout(() => {
                        window.location.href = 'jogadores.html';
                    }, 2000);
                } else {
                    this.showMessage(mensagemDiv, result.error || 'Erro no cadastro', 'error');
                }
                
            } catch (error) {
                console.error('Erro no cadastro:', error);
                this.showMessage(mensagemDiv, 'Erro de conexão com o servidor', 'error');
            }
        });
    }

    setupPartidaForm() {
        const form = document.getElementById('form-partida');
        if (!form) {
            return; // Não está na página de nova partida
        }
        
        // Carregar jogadores para o formulário
        this.loadJogadoresForForm();
        
        // Configurar data atual como padrão
        const dataInput = document.getElementById('data');
        if (dataInput) {
            const today = new Date().toISOString().split('T')[0];
            dataInput.value = today;
        }
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Coletar participantes selecionados
            const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
            const participantes = Array.from(checkboxes).map(cb => cb.value);
            
            if (participantes.length === 0) {
                alert('Selecione pelo menos um participante!');
                return;
            }
            
            const vencedorSelect = document.getElementById('vencedor');
            if (!vencedorSelect || !vencedorSelect.value) {
                alert('Selecione um vencedor!');
                return;
            }
            
            const formData = {
                data: document.getElementById('data')?.value || new Date().toISOString().split('T')[0],
                tipo: document.getElementById('tipo')?.value || 'global',
                vencedor_id: parseInt(vencedorSelect.value),
                participantes: participantes.join(','),
                observacoes: document.getElementById('observacoes')?.value || ''
            };
            
            try {
                const response = await fetch(`${this.apiBase}/partidas`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('✅ Partida registrada com sucesso!');
                    
                    // Redirecionar para página de partidas
                    setTimeout(() => {
                        window.location.href = 'partidas.html';
                    }, 1000);
                } else {
                    alert(`Erro: ${result.error || 'Falha no registro'}`);
                }
            } catch (error) {
                console.error('Erro ao registrar partida:', error);
                alert('Erro de conexão com o servidor');
            }
        });
    }

    async loadJogadoresForForm() {
        try {
            const response = await fetch(`${this.apiBase}/jogadores`);
            const jogadores = await response.json();
            
            // Preencher select de vencedor
            const vencedorSelect = document.getElementById('vencedor');
            if (vencedorSelect) {
                vencedorSelect.innerHTML = '<option value="">Selecione o vencedor</option>';
                jogadores.forEach(jogador => {
                    const option = document.createElement('option');
                    option.value = jogador.id;
                    option.textContent = `${jogador.apelido} (${jogador.patente})`;
                    vencedorSelect.appendChild(option);
                });
            }
            
            // Preencher checkbox de participantes
            const participantesContainer = document.getElementById('participantes-container');
            if (participantesContainer) {
                participantesContainer.innerHTML = '<div class="participantes-grid"></div>';
                const grid = participantesContainer.querySelector('.participantes-grid');
                
                jogadores.forEach(jogador => {
                    const div = document.createElement('div');
                    div.className = 'participante-checkbox';
                    div.innerHTML = `
                        <input type="checkbox" id="jogador-${jogador.id}" value="${jogador.id}">
                        <label for="jogador-${jogador.id}">
                            ${jogador.apelido} (${jogador.patente})
                        </label>
                    `;
                    grid.appendChild(div);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar jogadores:', error);
        }
    }

    async loadInitialData() {
        try {
            // Carregar estatísticas se estiver na homepage
            if (document.getElementById('total-jogadores')) {
                await this.loadStats();
                await this.loadPodium();
            }
            
            // Carregar ranking se estiver na página de ranking
            if (document.getElementById('lista-ranking-global')) {
                await this.loadRankings();
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/estatisticas`);
            const stats = await response.json();
            
            if (document.getElementById('total-jogadores')) {
                document.getElementById('total-jogadores').textContent = stats.total_jogadores || 0;
                document.getElementById('total-partidas').textContent = stats.total_partidas || 0;
                document.getElementById('record-vitorias').textContent = stats.record_vitorias || 0;
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async loadPodium() {
        try {
            const response = await fetch(`${this.apiBase}/ranking/global`);
            const ranking = await response.json();
            
            if (ranking.length > 0) {
                const podiumElements = {
                    1: { name: 'podium-1', wins: 'podium-1-vitorias' },
                    2: { name: 'podium-2', wins: 'podium-2-vitorias' },
                    3: { name: 'podium-3', wins: 'podium-3-vitorias' }
                };
                
                for (let i = 0; i < 3; i++) {
                    if (ranking[i]) {
                        const element = podiumElements[i + 1];
                        if (element && document.getElementById(element.name)) {
                            document.getElementById(element.name).textContent = ranking[i].apelido;
                            document.getElementById(element.wins).textContent = ranking[i].vitorias || 0;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao carregar pódio:', error);
        }
    }

    async loadRankings() {
        try {
            // Ranking Global
            const globalResponse = await fetch(`${this.apiBase}/ranking/global`);
            const globalRanking = await globalResponse.json();
            this.renderRanking(globalRanking, 'lista-ranking-global');
            
        } catch (error) {
            console.error('Erro ao carregar rankings:', error);
        }
    }

    renderRanking(ranking, elementId) {
        const tbody = document.getElementById(elementId);
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (ranking.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">
                        Nenhum dado disponível
                    </td>
                </tr>
            `;
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
                    <span class="percent-badge ${this.getPercentClass(percentual)}">
                        ${percentual}%
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

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

    getPercentClass(percent) {
        if (percent >= 50) return 'percent-high';
        if (percent >= 30) return 'percent-medium';
        return 'percent-low';
    }

    showMessage(element, message, type = 'success') {
        if (!element) return;
        
        element.innerHTML = `
            <div class="message message-${type}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                ${message}
            </div>
        `;
        element.style.display = 'block';
        
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async apiRequest(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${this.apiBase}${endpoint}`, options);
            
            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }
}

// Estilos dinâmicos CSS
const dynamicStyles = `
    .rank-position {
        display: inline-block;
        width: 32px;
        height: 32px;
        line-height: 32px;
        text-align: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        font-weight: bold;
    }
    
    .rank-1 {
        background: linear-gradient(135deg, #ffd700, #ffc400);
        color: #000;
    }
    
    .rank-2 {
        background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
        color: #000;
    }
    
    .rank-3 {
        background: linear-gradient(135deg, #cd7f32, #b87333);
        color: #000;
    }
    
    .percent-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .percent-high {
        background: rgba(40, 167, 69, 0.2);
        color: #28a745;
        border: 1px solid rgba(40, 167, 69, 0.3);
    }
    
    .percent-medium {
        background: rgba(255, 193, 7, 0.2);
        color: #ffc107;
        border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    .percent-low {
        background: rgba(220, 53, 69, 0.2);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.3);
    }
    
    .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .badge-primary {
        background: rgba(0, 123, 255, 0.2);
        color: #007bff;
        border: 1px solid rgba(0, 123, 255, 0.3);
    }
    
    .badge-warning {
        background: rgba(255, 193, 7, 0.2);
        color: #ffc107;
        border: 1px solid rgba(255, 193, 7, 0.3);
    }
    
    .badge-info {
        background: rgba(23, 162, 184, 0.2);
        color: #17a2b8;
        border: 1px solid rgba(23, 162, 184, 0.3);
    }
    
    .badge-danger {
        background: rgba(220, 53, 69, 0.2);
        color: #dc3545;
        border: 1px solid rgba(220, 53, 69, 0.3);
    }
    
    .badge-secondary {
        background: rgba(108, 117, 125, 0.2);
        color: #6c757d;
        border: 1px solid rgba(108, 117, 125, 0.3);
    }
    
    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        border-top-color: var(--secondary);
        animation: spin 1s ease-in-out infinite;
        margin: 0 auto 20px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .message {
        padding: 15px 20px;
        border-radius: var(--radius);
        margin: 20px 0;
        font-weight: 500;
    }
    
    .message-success {
        background: rgba(40, 167, 69, 0.1);
        border: 1px solid rgba(40, 167, 69, 0.3);
        color: #28a745;
    }
    
    .message-error {
        background: rgba(220, 53, 69, 0.1);
        border: 1px solid rgba(220, 53, 69, 0.3);
        color: #dc3545;
    }
    
    .message-warning {
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        color: #ffc107;
    }
    
    .loading {
        text-align: center;
        padding: 40px;
        color: rgba(255, 255, 255, 0.7);
    }
    
    .text-center {
        text-align: center;
    }
    
    .participantes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
        margin-top: 10px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: var(--radius);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .participante-checkbox {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .participante-checkbox input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
    }
    
    .participante-checkbox label {
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
    }
`;

// Adicionar estilos dinâmicos ao documento
const styleElement = document.createElement('style');
styleElement.textContent = dynamicStyles;
document.head.appendChild(styleElement);

// Inicializar sistema quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.warSystem = new WARSystem();
});

// Exportar funções úteis para uso global
window.WAR = {
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    },
    
    formatDateTime: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    },
    
    getPatenteIcon: (patente) => {
        const icons = {
            'Cabo 🪖': '🪖',
            'Soldado 🛡️': '🛡️',
            'Tenente ⚔️': '⚔️',
            'Capitão 👮': '👮',
            'Major 💪': '💪',
            'Coronel 🎖️': '🎖️',
            'General ⭐': '⭐',
            'Marechal 🏆': '🏆'
        };
        return icons[patente] || '🎖️';
    }
};
