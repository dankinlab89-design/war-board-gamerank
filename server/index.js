const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('public'));

// Instância do banco
const db = getDatabase();

// ====================
// ROTAS PARA ADMIN (ATUALIZAÇÃO)
// ====================

// Atualizar jogador (admin)
app.put('/api/admin/jogadores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, apelido, email, patente, status, observacoes } = req.body;
        
        if (!nome || !apelido || !patente || !status) {
            return res.status(400).json({ 
                sucesso: false, 
                error: 'Dados incompletos' 
            });
        }
        
        const result = await db.updateJogador(id, {
            nome,
            apelido,
            email: email || null,
            patente,
            status,
            observacoes: observacoes || ''
        });
        
        res.json(result);
        
    } catch (error) {
        console.error('Erro ao atualizar jogador:', error);
        res.status(500).json({ 
            sucesso: false, 
            error: error.message || 'Erro interno do servidor' 
        });
    }
});

// Alterar status do jogador (admin)
app.patch('/api/admin/jogadores/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!status || !['Ativo', 'Inativo'].includes(status)) {
            return res.status(400).json({ 
                sucesso: false, 
                error: 'Status inválido. Use "Ativo" ou "Inativo"' 
            });
        }
        
        const result = await db.updateStatus(id, status);
        res.json(result);
        
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        res.status(500).json({ 
            sucesso: false, 
            error: error.message || 'Erro interno do servidor' 
        });
    }
});

// ====================
// ROTAS DE JOGADORES
// ====================

// Listar todos os jogadores
app.get('/api/jogadores', async (req, res) => {
    try {
        const jogadores = await db.getJogadores();
        res.json(jogadores);
    } catch (error) {
        console.error('Erro ao buscar jogadores:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Cadastrar novo jogador
app.post('/api/jogadores', async (req, res) => {
    try {
        const { nome, apelido, email, observacoes } = req.body;
        
        if (!nome || !apelido) {
            return res.status(400).json({ 
                sucesso: false, 
                error: 'Nome e apelido são obrigatórios' 
            });
        }
        
        const result = await db.addJogador({
            nome: nome.trim(),
            apelido: apelido.trim(),
            email: email?.trim() || null,
            observacoes: observacoes?.trim() || ''
        });
        
        res.json({
            sucesso: true,
            mensagem: 'Jogador cadastrado com sucesso!',
            jogador: {
                id: result.id,
                nome: nome.trim(),
                apelido: apelido.trim(),
                patente: result.patente,
                status: 'Ativo'
            }
        });
        
    } catch (error) {
        console.error('Erro ao cadastrar jogador:', error);
        res.status(500).json({ 
            sucesso: false, 
            error: error.message || 'Erro interno ao cadastrar jogador' 
        });
    }
});

// ====================
// ROTAS DE PARTIDAS
// ====================

// Listar todas as partidas
app.get('/api/partidas', async (req, res) => {
    try {
        const partidas = await db.getPartidas();
        res.json(partidas);
    } catch (error) {
        console.error('Erro ao buscar partidas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registrar nova partida
app.post('/api/partidas', async (req, res) => {
    try {
        const { data, tipo, vencedor_id, participantes, observacoes } = req.body;
        
        // Validações
        if (!vencedor_id || !participantes) {
            return res.status(400).json({ 
                sucesso: false, 
                error: 'Vencedor e participantes são obrigatórios' 
            });
        }
        
        // Verificar se vencedor está na lista de participantes
        const participantesArray = participantes.split(',').map(id => parseInt(id.trim()));
        if (!participantesArray.includes(parseInt(vencedor_id))) {
            return res.status(400).json({ 
                sucesso: false, 
                error: 'Vencedor deve estar na lista de participantes' 
            });
        }
        
        // Verificar mínimo de 3 participantes
        if (participantesArray.length < 3) {
            return res.status(400).json({ 
                sucesso: false, 
                error: 'É necessário pelo menos 3 participantes' 
            });
        }
        
        const result = await db.addPartida({
            data: data || new Date().toISOString(),
            tipo: tipo || 'global',
            vencedor_id: parseInt(vencedor_id),
            participantes: participantes,
            observacoes: observacoes || ''
        });
        
        res.json({
            sucesso: true,
            mensagem: 'Partida registrada com sucesso!',
            partida: {
                id: result.id,
                vencedor_id: vencedor_id
            }
        });
        
    } catch (error) {
        console.error('Erro ao registrar partida:', error);
        res.status(500).json({ 
            sucesso: false, 
            error: error.message || 'Erro interno ao registrar partida' 
        });
    }
});

// ====================
// ROTAS DE ESTATÍSTICAS E RANKING
// ====================

// Estatísticas gerais
app.get('/api/estatisticas', async (req, res) => {
    try {
        const estatisticas = await db.getEstatisticas();
        
        // Buscar record holder
        const ranking = await db.getRankingGlobal();
        const recordHolder = ranking.length > 0 ? ranking[0].apelido : '-';
        
        res.json({
            total_jogadores: estatisticas.total_jogadores || 0,
            total_partidas: estatisticas.total_partidas || 0,
            record_vitorias: estatisticas.record_vitorias || 0,
            record_holder: recordHolder
        });
        
    } catch (error) {
        console.error('Erro estatísticas:', error);
        res.json({
            total_jogadores: 0,
            total_partidas: 0,
            record_vitorias: 0,
            record_holder: '-'
        });
    }
});

// Ranking Global
app.get('/api/ranking/global', async (req, res) => {
    try {
        const ranking = await db.getRankingGlobal();
        res.json(ranking);
    } catch (error) {
        console.error('Erro ranking global:', error);
        res.json([]);
    }
});

// Distribuição de patentes
app.get('/api/estatisticas/patentes', async (req, res) => {
    try {
        const jogadores = await db.getJogadores();
        
        const patentes = {
            'Cabo 🪖': 0,
            'Soldado 🛡️': 0,
            'Tenente ⚔️': 0,
            'Capitão 👮': 0,
            'Major 💪': 0,
            'Coronel 🎖️': 0,
            'General ⭐': 0,
            'Marechal 🏆': 0
        };
        
        jogadores.forEach(jogador => {
            const patente = jogador.patente || 'Cabo 🪖';
            if (patentes[patente] !== undefined) {
                patentes[patente] = (patentes[patente] || 0) + 1;
            }
        });
        
        res.json(patentes);
        
    } catch (error) {
        console.error('Erro patentes:', error);
        res.json(patentes);
    }
});

// Assiduidade (jogadores com mais partidas)
app.get('/api/estatisticas/assiduidade', async (req, res) => {
    try {
        const partidas = await db.getPartidas();
        const jogadores = await db.getJogadores();
        
        // Calcular partidas por jogador
        const partidasPorJogador = {};
        
        partidas.forEach(partida => {
            if (partida.participantes) {
                const participantes = partida.participantes.split(',').map(id => id.trim());
                participantes.forEach(jogadorId => {
                    partidasPorJogador[jogadorId] = (partidasPorJogador[jogadorId] || 0) + 1;
                });
            }
        });
        
        // Mapear para jogadores
        const assiduidade = jogadores.map(jogador => {
            const partidas = partidasPorJogador[jogador.id] || 0;
            return {
                apelido: jogador.apelido,
                partidas: partidas
            };
        })
        .filter(j => j.partidas > 0)
        .sort((a, b) => b.partidas - a.partidas)
        .slice(0, 10);
        
        res.json(assiduidade);
        
    } catch (error) {
        console.error('Erro assiduidade:', error);
        res.json([]);
    }
});

// Ranking de Performance
app.get('/api/ranking/performance', async (req, res) => {
    try {
        const ranking = await db.getRankingGlobal();
        
        // Filtrar jogadores com pelo menos 3 partidas e calcular performance
        const performanceRanking = ranking
            .filter(jogador => (jogador.partidas || 0) >= 3)
            .map(jogador => {
                const partidas = jogador.partidas || 0;
                const vitorias = jogador.vitorias || 0;
                const percentual = partidas > 0 ? 
                    ((vitorias / partidas) * 100).toFixed(1) : 0;
                
                return {
                    apelido: jogador.apelido,
                    patente: jogador.patente,
                    vitorias: vitorias,
                    partidas: partidas,
                    percentual: parseFloat(percentual)
                };
            })
            .sort((a, b) => b.percentual - a.percentual);
        
        res.json(performanceRanking);
        
    } catch (error) {
        console.error('Erro ranking performance:', error);
        res.json([]);
    }
});

// Ranking Mensal (simplificado - usa dados do mês atual)
app.get('/api/ranking/mensal/:ano/:mes', async (req, res) => {
    try {
        const ranking = await db.getRankingGlobal();
        
        // Simplificação: retorna ranking global por enquanto
        const rankingMensal = ranking.map(jogador => ({
            apelido: jogador.apelido,
            patente: jogador.patente,
            vitorias: jogador.vitorias || 0,
            partidas: jogador.partidas || 0
        }));
        
        res.json(rankingMensal);
        
    } catch (error) {
        console.error('Erro ranking mensal:', error);
        res.json([]);
    }
});

// Vencedores Mensais (simplificado)
app.get('/api/vencedores-mensais/:ano', async (req, res) => {
    try {
        const { ano } = req.params;
        const partidas = await db.getPartidas();
        
        const vencedores = {};
        
        // Processar partidas do ano especificado
        partidas.forEach(partida => {
            if (!partida.data) return;
            
            const data = new Date(partida.data);
            if (data.getFullYear() === parseInt(ano)) {
                const mes = data.getMonth() + 1; // Janeiro = 1
                const vencedorNome = partida.vencedor_nome || `Jogador ${partida.vencedor_id}`;
                
                if (!vencedores[mes]) {
                    vencedores[mes] = {
                        vencedor: vencedorNome,
                        patente: partida.vencedor_patente || 'Cabo 🪖',
                        vitorias: 1
                    };
                } else {
                    vencedores[mes].vitorias += 1;
                }
            }
        });
        
        res.json(vencedores);
        
    } catch (error) {
        console.error('Erro vencedores mensais:', error);
        res.json({});
    }
});

// ====================
// ROTAS ADMIN (SIMPLIFICADAS)
// ====================

// Backup simplificado
app.get('/api/admin/backup', async (req, res) => {
    try {
        const [jogadores, partidas] = await Promise.all([
            db.getJogadores(),
            db.getPartidas()
        ]);
        
        res.json({
            sucesso: true,
            data: {
                jogadores: jogadores,
                partidas: partidas,
                backup_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Erro backup:', error);
        res.status(500).json({ sucesso: false, error: 'Erro no backup' });
    }
});

// Testar conexão com banco
app.get('/api/admin/test-db', async (req, res) => {
    try {
        res.json({ 
            sucesso: true, 
            message: 'API está funcionando',
            timestamp: new Date().toISOString(),
            mode: db.devMode ? 'dev' : 'production'
        });
    } catch (error) {
        res.status(500).json({ sucesso: false, error: error.message });
    }
});

// ====================
// ROTA DE SAÚDE
// ====================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'WAR Board GameRank API',
        version: '2.0.0'
    });
});

// ====================
// ROTA FALLBACK
// ====================

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/../public/index.html');
});

// ====================
// INICIAR SERVIDOR
// ====================

app.listen(PORT, () => {
    console.log(`🚀 Servidor WAR Board GameRank rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📊 Modo: ${db.devMode ? 'Desenvolvimento (memória)' : 'Produção (PostgreSQL)'}`);
});

// Agendador simplificado
function setupSimpleScheduler() {
    console.log('⏰ Agendador simplificado iniciado');
    
    // Apenas mantém o servidor ativo
    setInterval(() => {
        console.log('💓 Sistema ativo:', new Date().toISOString());
    }, 300000); // A cada 5 minutos
}

// Iniciar agendador
setupSimpleScheduler();
