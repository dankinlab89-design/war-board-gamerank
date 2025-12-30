const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// Health check - SIMPLES
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online',
        service: 'WAR Board GameRank',
        timestamp: new Date().toISOString()
    });
});

// API de jogadores - SIMPLES
app.get('/api/jogadores', (req, res) => {
    res.json([
        { id: 1, nome: 'Comandante Silva', apelido: 'Silva', patente: 'General ⭐' },
        { id: 2, nome: 'Capitão Santos', apelido: 'Santos', patente: 'Capitão 👮' },
        { id: 3, nome: 'Tenente Costa', apelido: 'Costa', patente: 'Tenente ⚔️' }
    ]);
});

// API de partidas - SIMPLES
app.get('/api/partidas', (req, res) => {
    res.json([]);
});

// API de ranking - SIMPLES
app.get('/api/ranking/global', (req, res) => {
    res.json([
        { apelido: 'Silva', patente: 'General ⭐', vitorias: 10, partidas: 20 },
        { apelido: 'Santos', patente: 'Capitão 👮', vitorias: 8, partidas: 15 },
        { apelido: 'Costa', patente: 'Tenente ⚔️', vitorias: 5, partidas: 12 }
    ]);
});

// API de estatísticas - SIMPLES
app.get('/api/estatisticas', (req, res) => {
    res.json({
        total_jogadores: 3,
        total_partidas: 0,
        record_vitorias: 10
    });
});

// API POST para cadastro - SIMPLES
app.post('/api/jogadores', (req, res) => {
    const { nome, apelido } = req.body;
    
    if (!nome || !apelido) {
        return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
    }
    
    // Simular cadastro
    const novoId = Math.floor(Math.random() * 1000) + 10;
    
    res.json({
        sucesso: true,
        id: novoId,
        mensagem: `Jogador ${apelido} cadastrado com sucesso!`,
        patente: 'Cabo 🪖'
    });
});

// API POST para partidas - SIMPLES
app.post('/api/partidas', (req, res) => {
    const { vencedor_id, participantes } = req.body;
    
    if (!vencedor_id || !participantes) {
        return res.status(400).json({ error: 'Vencedor e participantes são obrigatórios' });
    }
    
    res.json({
        sucesso: true,
        id: Date.now(),
        mensagem: 'Partida registrada com sucesso!'
    });
});

// Rota para SPA (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
});
