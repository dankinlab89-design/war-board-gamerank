const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { getDatabase } = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false // Simplificar para Render
}));
app.use(morgan('dev')); // Mudar para 'dev' em produção
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// Banco de dados
const db = getDatabase();

// ============ ROTAS DA API ============

// Health check para Render
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    service: 'WAR Board GameRank',
    environment: process.env.NODE_ENV || 'development',
    database: db.devMode ? 'dev-mode' : 'postgresql',
    timestamp: new Date().toISOString()
  });
});

// ... resto das rotas API (manter como está) ...

// Rota para todas as outras requisições (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
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
