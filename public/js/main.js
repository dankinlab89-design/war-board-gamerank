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
        // Adicionar event listeners gerais aqui
        console.log('WAR System inicializado');
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
            
            // Ranking Mensal
            const mesAtual = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${new Date().getFullYear()}`;
            const mensalResponse = await fetch(`${this.apiBase}/ranking/mensal/${mesAtual}`);
            const mensalRanking = await mensalResponse.json();
            this.renderRanking(mensalRanking, 'lista-ranking-mensal');
            
            // Ranking Performance
            const performanceRanking = this.calculatePerformanceRanking(globalRanking);
            this.renderPerformanceRanking(performanceRanking);
            
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

    renderPerformanceRanking(ranking) {
        const tbody = document.getElementById('lista-ranking-performance');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        ranking.forEach((jogador, index) => {
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
                    <div class="performance-bar">
                        <div class="performance-fill" style="width: ${jogador.performance}%"></div>
                        <span>${jogador.performance}%</span>
                    </div>
                </td>
                <td>
                    <span class="performance-level ${jogador.nivel.toLowerCase()}">
                        ${jogador.nivel}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    calculatePerformanceRanking(ranking) {
        return ranking.map(jogador => {
            const performance = jogador.partidas > 0 ? 
                (jogador.vitorias / jogador.partidas) * 100 : 0;
            
            let nivel = 'Iniciante';
            if (performance >= 70) nivel = 'Lendário ⭐';
            else if (performance >= 50) nivel = 'Veterano 🏆';
            else if (performance >= 30) nivel = 'Intermediário ⚔️';
            else if (performance >= 10) nivel = 'Iniciante 🪖';
            else nivel = 'Novato';
            
            return {
                ...jogador,
                performance: performance.toFixed(1),
                nivel: nivel
            };
        }).sort((a, b) => b.performance - a.performance);
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

    // Função para mostrar mensagens
    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        // Adicionar ao topo da página
        document.body.insertBefore(messageDiv, document.body.firstChild);
        
        // Remover após 5 segundos
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // Função para formatar datas
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Função para formatar horas
    formatTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Função para fazer requisições à API
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

// Adicionar estilos dinâmicos para CSS
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
    
    .performance-bar {
        width: 100%;
        height: 24px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
        position: relative;
    }
    
    .performance-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--secondary), var(--accent));
        border-radius: 12px;
        transition: width 0.5s ease;
    }
    
    .performance-bar span {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 600;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    .performance-level {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .performance-level.lendário {
        background: linear-gradient(135deg, #ffd700, #ffc400);
        color: #000;
    }
    
    .performance-level.veterano {
        background: linear-gradient(135deg, #6610f2, #4d0ab1);
        color: white;
    }
    
    .performance-level.intermediário {
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
    }
    
    .performance-level.iniciante {
        background: linear-gradient(135deg, #28a745, #1e7e34);
        color: white;
    }
    
    .performance-level.novato {
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
    }
    
    .status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .status-badge.ativo {
        background: rgba(40, 167, 69, 0.2);
        color: #28a745;
        border: 1px solid rgba(40, 167, 69, 0.3);
    }
    
    .status-badge.inativo {
        background: rgba(108, 117, 125, 0.2);
        color: #6c757d;
        border: 1px solid rgba(108, 117, 125, 0.3);
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
    
    .btn-action {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.8);
        width: 36px;
        height: 36px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin: 0 5px;
        transition: all 0.3s ease;
    }
    
    .btn-action:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
    }
    
    .btn-action.btn-danger {
        background: rgba(220, 53, 69, 0.2);
        border-color: rgba(220, 53, 69, 0.3);
    }
    
    .btn-action.btn-danger:hover {
        background: rgba(220, 53, 69, 0.3);
    }
    
    .text-center {
        text-align: center;
    }
    
    .form-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-xl);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .form-actions {
        display: flex;
        gap: 15px;
        margin-top: 30px;
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
    
    // Inicializar componentes específicos de página
    if (document.getElementById('form-cadastro')) {
        setupCadastroForm();
    }
    
    if (document.getElementById('form-partida')) {
        setupPartidaForm();
    }
});

// Configurar formulário de cadastro
function setupCadastroForm() {
    const form = document.getElementById('form-cadastro');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            nome: document.getElementById('nome').value,
            apelido: document.getElementById('apelido').value,
            email: document.getElementById('email').value,
            patente: document.getElementById('patente').value,
            observacoes: document.getElementById('observacoes').value
        };
        
        try {
            const result = await window.warSystem.apiRequest('/jogadores', 'POST', formData);
            
            if (result.sucesso) {
                window.warSystem.showMessage(result.mensagem, 'success');
                form.reset();
                
                // Redirecionar após 2 segundos
                setTimeout(() => {
                    window.location.href = 'jogadores.html';
                }, 2000);
            } else {
                window.warSystem.showMessage(result.error || 'Erro no cadastro', 'error');
            }
        } catch (error) {
            window.warSystem.showMessage('Erro de conexão', 'error');
        }
    });
}

// Configurar formulário de partida
function setupPartidaForm() {
    const form = document.getElementById('form-partida');
    if (!form) return;
    
    // Carregar jogadores para os selects
    loadJogadoresForForm();
    
    // Configurar data atual como padrão
    const dataInput = document.getElementById('data');
    if (dataInput) {
        const today = new Date().toISOString().split('T')[0];
        dataInput.value = today;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Coletar participantes selecionados
        const participantes = Array.from(
            document.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        
        if (participantes.length === 0) {
            window.warSystem.showMessage('Selecione pelo menos um participante!', 'error');
            return;
        }
        
        const formData = {
            data: document.getElementById('data').value,
            tipo: document.getElementById('tipo').value,
            vencedor_id: parseInt(document.getElementById('vencedor').value),
            participantes: participantes.join(','),
            observacoes: document.getElementById('observacoes').value
        };
        
        try {
            const result = await window.warSystem.apiRequest('/partidas', 'POST', formData);
            
            if (result.sucesso) {
                window.warSystem.showMessage(result.mensagem, 'success');
                form.reset();
                
                // Redefinir data para hoje
                if (dataInput) {
                    dataInput.value = new Date().toISOString().split('T')[0];
                }
                
                // Redirecionar após 2 segundos
                setTimeout(() => {
                    window.location.href = 'partidas.html';
                }, 2000);
            } else {
                window.warSystem.showMessage(result.error || 'Erro no registro', 'error');
            }
        } catch (error) {
            window.warSystem.showMessage('Erro de conexão', 'error');
        }
    });
}

// Carregar jogadores para formulários
async function loadJogadoresForForm() {
    try {
        const jogadores = await window.warSystem.apiRequest('/jogadores');
        
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
// Função para carregar jogadores nos selects
async function loadJogadoresForSelects() {
    try {
        const response = await fetch('/api/jogadores');
        const jogadores = await response.json();
        
        // Para formulário de nova partida (se existir)
        const vencedorSelect = document.getElementById('vencedor');
        const participantesContainer = document.getElementById('participantes-container');
        
        if (vencedorSelect) {
            vencedorSelect.innerHTML = '<option value="">Selecione o vencedor</option>';
            jogadores.forEach(jogador => {
                const option = document.createElement('option');
                option.value = jogador.id;
                option.textContent = `${jogador.apelido} (${jogador.patente})`;
                vencedorSelect.appendChild(option);
            });
        }
        
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

// Chamar quando a página carregar
if (document.getElementById('vencedor') || document.getElementById('participantes-container')) {
    document.addEventListener('DOMContentLoaded', loadJogadoresForSelects);
}
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
