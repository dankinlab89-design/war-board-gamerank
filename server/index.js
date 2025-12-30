const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getDatabase } = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar banco de dados
const db = getDatabase();

// ============ ROTAS DA API ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        service: 'WAR Board GameRank API',
        version: '2.0.0'
    });
});

// JOGADORES
app.get('/api/jogadores', (req, res) => {
    try {
        const jogadores = db.getJogadores();
        res.json(jogadores);
    } catch (error) {
        console.error('Erro GET /jogadores:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar jogadores',
            details: error.message 
        });
    }
});

app.post('/api/jogadores', (req, res) => {
    try {
        const { nome, apelido, email, observacoes } = req.body;
        
        // Validações
        if (!nome || !apelido) {
            return res.status(400).json({ 
                error: 'Nome e apelido são obrigatórios' 
            });
        }
        
        if (apelido.length < 2) {
            return res.status(400).json({ 
                error: 'Apelido deve ter pelo menos 2 caracteres' 
            });
        }
        
        const result = db.addJogador({
            nome: nome.trim(),
            apelido: apelido.trim(),
            email: email?.trim() || null,
            observacoes: observacoes?.trim() || ''
        });
        
        res.json({
            ...result,
            mensagem: `Jogador ${apelido} cadastrado com sucesso!`
        });
    } catch (error) {
        console.error('Erro POST /jogadores:', error);
        
        if (error.message.includes('já está em uso')) {
            res.status(409).json({ 
                error: error.message 
            });
        } else {
            res.status(500).json({ 
                error: 'Erro ao cadastrar jogador',
                details: error.message 
            });
        }
    }
});

// PARTIDAS
app.get('/api/partidas', (req, res) => {
    try {
        const partidas = db.getPartidas();
        res.json(partidas);
    } catch (error) {
        console.error('Erro GET /partidas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar partidas',
            details: error.message 
        });
    }
});

app.post('/api/partidas', (req, res) => {
    try {
        const { data, tipo, vencedor_id, participantes, observacoes } = req.body;
        
        // Validações
        if (!vencedor_id) {
            return res.status(400).json({ 
                error: 'Selecione um vencedor' 
            });
        }
        
        if (!participantes) {
            return res.status(400).json({ 
                error: 'Selecione os participantes' 
            });
        }
        
        // Converter participantes para array se for string
        let participantesArray;
        if (typeof participantes === 'string') {
            participantesArray = participantes.split(',').map(id => parseInt(id.trim()));
        } else if (Array.isArray(participantes)) {
            participantesArray = participantes.map(id => parseInt(id));
        } else {
            return res.status(400).json({ 
                error: 'Formato de participantes inválido' 
            });
        }
        
        if (participantesArray.length < 2) {
            return res.status(400).json({ 
                error: 'É necessário pelo menos 2 participantes' 
            });
        }
        
        if (!participantesArray.includes(parseInt(vencedor_id))) {
            return res.status(400).json({ 
                error: 'O vencedor deve estar entre os participantes' 
            });
        }
        
        const result = db.addPartida({
            data: data || new Date().toISOString().split('T')[0],
            tipo: tipo || 'global',
            vencedor_id: parseInt(vencedor_id),
            participantes: participantesArray.join(','),
            observacoes: observacoes || ''
        });
        
        res.json({
            ...result,
            mensagem: 'Partida registrada com sucesso!'
        });
    } catch (error) {
        console.error('Erro POST /partidas:', error);
        
        if (error.message.includes('participantes') || error.message.includes('vencedor')) {
            res.status(400).json({ 
                error: error.message 
            });
        } else {
            res.status(500).json({ 
                error: 'Erro ao registrar partida',
                details: error.message 
            });
        }
    }
});

// RANKINGS
app.get('/api/ranking/global', (req, res) => {
    try {
        const ranking = db.getRankingGlobal();
        res.json(ranking);
    } catch (error) {
        console.error('Erro GET /ranking/global:', error);
        res.status(500).json({ 
            error: 'Erro ao calcular ranking',
            details: error.message 
        });
    }
});

app.get('/api/ranking/mensal/:mesAno', (req, res) => {
    try {
        const { mesAno } = req.params;
        
        // Validar formato MM/YYYY
        if (!/^\d{2}\/\d{4}$/.test(mesAno)) {
            return res.status(400).json({ 
                error: 'Formato inválido. Use MM/YYYY (ex: 01/2024)' 
            });
        }
        
        const ranking = db.getRankingMensal(mesAno);
        res.json(ranking);
    } catch (error) {
        console.error('Erro GET /ranking/mensal:', error);
        res.status(500).json({ 
            error: 'Erro ao calcular ranking mensal',
            details: error.message 
        });
    }
});

// ESTATÍSTICAS
app.get('/api/estatisticas', (req, res) => {
    try {
        const estatisticas = db.getEstatisticas();
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro GET /estatisticas:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar estatísticas',
            details: error.message 
        });
    }
});

// VENCEDORES MENSAIS
app.get('/api/vencedores/:ano', (req, res) => {
    try {
        const { ano } = req.params;
        
        // Validar ano (4 dígitos)
        if (!/^\d{4}$/.test(ano)) {
            return res.status(400).json({ 
                error: 'Ano inválido. Use YYYY (ex: 2024)' 
            });
        }
        
        const vencedores = db.getVencedoresMensais(ano);
        res.json(vencedores);
    } catch (error) {
        console.error('Erro GET /vencedores:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar vencedores',
            details: error.message 
        });
    }
});

// Rota para obter informações de um jogador específico
app.get('/api/jogadores/:id', (req, res) => {
    try {
        const { id } = req.params;
        const jogador = db.getJogadorById(parseInt(id));
        
        if (!jogador) {
            return res.status(404).json({ 
                error: 'Jogador não encontrado' 
            });
        }
        
        res.json(jogador);
    } catch (error) {
        console.error('Erro GET /jogadores/:id:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar jogador',
            details: error.message 
        });
    }
});

// Rota para backup do banco (apenas para admin futuramente)
app.get('/api/admin/backup', (req, res) => {
    try {
        // Em produção, adicionar autenticação aqui
        const backupPath = db.backupDatabase();
        res.json({ 
            sucesso: true, 
            mensagem: 'Backup criado com sucesso',
            caminho: backupPath 
        });
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        res.status(500).json({ 
            error: 'Erro ao criar backup',
            details: error.message 
        });
    }
});

// Rota para Netlify Functions
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

// Para desenvolvimento local
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`🌐 API disponível em: http://localhost:${PORT}/api`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`👥 Jogadores: http://localhost:${PORT}/api/jogadores`);
        console.log(`🎮 Partidas: http://localhost:${PORT}/api/partidas`);
        console.log(`🏆 Ranking: http://localhost:${PORT}/api/ranking/global`);
    });
}
