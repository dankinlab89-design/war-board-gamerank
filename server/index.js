const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { getDatabase } = require('./database');

const app = express();

// Middleware com CSP ajustado para permitir scripts inline
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Banco de dados
const db = getDatabase();

// ============ ROTAS DA API ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online',
        service: 'WAR Board GameRank',
        environment: process.env.NODE_ENV || 'development',
        database: db.devMode ? 'dev-mode' : 'postgresql',
        timestamp: new Date().toISOString()
    });
});

// JOGADORES
app.get('/api/jogadores', async (req, res) => {
    try {
        const jogadores = await db.getJogadores();
        res.json(jogadores);
    } catch (error) {
        console.error('Erro API /jogadores:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/jogadores', async (req, res) => {
    try {
        const { nome, apelido, email, observacoes } = req.body;
        
        if (!nome || !apelido) {
            return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
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
        console.error('Erro API POST /jogadores:', error);
        res.status(400).json({ error: error.message });
    }
});

// PARTIDAS
app.get('/api/partidas', async (req, res) => {
    try {
        const partidas = await db.getPartidas();
        res.json(partidas);
    } catch (error) {
        console.error('Erro API /partidas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/partidas', async (req, res) => {
    try {
        const { vencedor_id, participantes, observacoes, tipo } = req.body;
        
        // Validações
        if (!vencedor_id || !participantes) {
            return res.status(400).json({ error: 'Vencedor e participantes são obrigatórios' });
        }
        
        const participantesArray = participantes.split(',').map(id => parseInt(id.trim()));
        
        if (participantesArray.length < 3) {
            return res.status(400).json({ error: 'É necessário pelo menos 3 participantes' });
        }
        
        if (!participantesArray.includes(parseInt(vencedor_id))) {
            return res.status(400).json({ error: 'O vencedor deve estar entre os participantes' });
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
        console.error('Erro API POST /partidas:', error);
        res.status(400).json({ error: error.message });
    }
});

// RANKINGS
app.get('/api/ranking/global', async (req, res) => {
    try {
        const ranking = await db.getRankingGlobal();
        res.json(ranking);
    } catch (error) {
        console.error('Erro API /ranking/global:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ESTATÍSTICAS
app.get('/api/estatisticas', async (req, res) => {
    try {
        const estatisticas = await db.getEstatisticas();
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro API /estatisticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para todas as outras requisições (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err.stack);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🎮 Frontend: http://localhost:${PORT}`);
});
