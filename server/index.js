const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { getDatabase } = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Banco de dados
const db = getDatabase();

// ============ ROTAS DA API ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online',
        service: 'WAR Board GameRank API',
        database: 'PostgreSQL Neon',
        timestamp: new Date().toISOString()
    });
});

// Teste do banco
app.get('/api/test-db', async (req, res) => {
    try {
        const jogadores = await db.getJogadores();
        const partidas = await db.getPartidas();
        
        res.json({
            success: true,
            message: 'Banco de dados conectado com sucesso!',
            jogadores_count: jogadores.length,
            partidas_count: partidas.length,
            jogadores_sample: jogadores.slice(0, 3)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// JOGADORES
app.get('/api/jogadores', async (req, res) => {
    try {
        const jogadores = await db.getJogadores();
        res.json(jogadores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/jogadores', async (req, res) => {
    try {
        const { nome, apelido, email, observacoes } = req.body;
        
        // Validação
        if (!nome || !apelido) {
            return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
        }
        
        if (apelido.length < 2) {
            return res.status(400).json({ error: 'Apelido deve ter pelo menos 2 caracteres' });
        }
        
        const result = await db.addJogador({
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
        
        if (error.message.includes('já está em uso') || error.message.includes('UNIQUE')) {
            res.status(409).json({ error: 'Apelido já cadastrado' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// PARTIDAS
app.get('/api/partidas', async (req, res) => {
    try {
        const partidas = await db.getPartidas();
        res.json(partidas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/partidas', async (req, res) => {
    try {
        const { vencedor_id, participantes, observacoes, tipo } = req.body;
        
        // Validação
        if (!vencedor_id || !participantes) {
            return res.status(400).json({ error: 'Vencedor e participantes são obrigatórios' });
        }
        
        const result = await db.addPartida({
            vencedor_id: parseInt(vencedor_id),
            participantes: participantes,
            observacoes: observacoes || '',
            tipo: tipo || 'global'
        });
        
        res.json({
            ...result,
            mensagem: 'Partida registrada com sucesso!'
        });
    } catch (error) {
        console.error('Erro POST /partidas:', error);
        res.status(400).json({ error: error.message });
    }
});

// RANKINGS
app.get('/api/ranking/global', async (req, res) => {
    try {
        const ranking = await db.getRankingGlobal();
        res.json(ranking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ESTATÍSTICAS
app.get('/api/estatisticas', async (req, res) => {
    try {
        const estatisticas = await db.getEstatisticas();
        res.json(estatisticas);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
        console.log(`📊 Teste DB: http://localhost:${PORT}/api/test-db`);
        console.log(`👥 Jogadores: http://localhost:${PORT}/api/jogadores`);
        console.log(`🎮 Partidas: http://localhost:${PORT}/api/partidas`);
        console.log(`🏆 Ranking: http://localhost:${PORT}/api/ranking/global`);
    });
}
