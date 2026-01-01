const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Configuração CORS segura
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'Acesso não permitido por CORS';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// ... depois do app.use(cors(...)) e app.use(express.json())

// SERVIR ARQUIVOS ESTÁTICOS DO FRONTEND
app.use(express.static('public'));

// Rota para página inicial
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

// API Routes continuam abaixo...
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar ao MongoDB
console.log('🔄 Conectando ao MongoDB...');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB conectado com sucesso!');
})
.catch(err => {
  console.error('❌ ERRO MongoDB:', err.message);
});

// Rota principal
//
app.get('/', (req, res) => {
  res.json({ 
    message: '🎮 API War Board - Online!',
    status: 'operacional',
    database: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    endpoints: ['/api/health', '/api/matches']
  });
});

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    database: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado',
    tempo: process.uptime() + ' segundos'
  });
});

// Rota para partidas (exemplo)
app.post('/api/matches', (req, res) => {
  res.json({ 
    message: 'Partida salva! (funcionalidade em desenvolvimento)',
    dados: req.body
  });
});

app.get('/api/matches', (req, res) => {
  res.json([
    { id: 1, data: '2024-01-20', vencedor: 'João', jogadores: 4 },
    { id: 2, data: '2024-01-18', vencedor: 'Maria', jogadores: 3 }
  ]);
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
