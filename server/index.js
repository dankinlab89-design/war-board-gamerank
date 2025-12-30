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

// Inicializar banco
const db = getDatabase();

// ============ ROTAS SIMPLIFICADAS ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        database: 'PostgreSQL Neon',
        timestamp: new Date().toISOString()
    });
});

// Teste de conexão com banco
app.get('/api/test-db', async (req, res) => {
    try {
        const jogadores = await db.getJogadores();
        res.json({ 
            sucesso: true, 
            mensagem: 'Conexão com banco OK',
            total_jogadores: jogadores.length,
            jogadores: jogadores.slice(0, 3) // Primeiros 3
        });
    } catch (error) {
        res.status(500).json({ 
            sucesso: false, 
            error: error.message 
        });
    }
});

// Jogadores
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
        
        if (!nome || !apelido) {
            return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
        }
        
        const result = await db.addJogador({
            nome, apelido, email, observacoes
        });
        
        res.json({
            ...result,
            mensagem: 'Jogador cadastrado com sucesso!'
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Partidas
app.get('/api/partidas', async (req, res) => {
    try {
        const partidas = await db.getPartidas();
        res.json(partidas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ranking
app.get('/api/ranking/global', async (req, res) => {
    try {
        const ranking = await db.getRankingGlobal();
        res.json(ranking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Estatísticas
app.get('/api/estatisticas', async (req, res) => {
    try {
        const stats = await db.getEstatisticas();
        res.json(stats);
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
    });
}
