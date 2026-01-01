const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Configuração CORS
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://war-board-gamerank.onrender.com']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SERVIR ARQUIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, '../public')));

// Conectar MongoDB
console.log('🔄 Conectando ao MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/war-database', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB conectado!'))
.catch(err => console.error('❌ Erro MongoDB:', err));

// ROTAS DA API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    database: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    message: 'War Board API funcionando!'
  });
});

// Exemplo de rota para partidas
app.get('/api/partidas', (req, res) => {
  res.json([
    { id: 1, data: '2024-01-20', vencedor: 'João', jogadores: 4 },
    { id: 2, data: '2024-01-18', vencedor: 'Maria', jogadores: 3 }
  ]);
});

app.post('/api/partidas', (req, res) => {
  console.log('Nova partida:', req.body);
  res.json({ 
    success: true, 
    message: 'Partida salva!',
    data: req.body 
  });
});

// ROTAS PARA PÁGINAS HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/partidas', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/partidas.html'));
});

app.get('/ranking', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/ranking.html'));
});

app.get('/jogadores', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/jogadores.html'));
});

app.get('/nova-partida', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nova-partida.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`📁 Frontend servido de: ${path.join(__dirname, '../public')}`);
  console.log(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Aguardando...'}`);
});
