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

// Conectar ao MongoDB com logs detalhados
console.log('🔄 Iniciando conexão MongoDB...');
console.log('📍 String usada:', process.env.MONGODB_URI ? 'Configurada via variável de ambiente' : 'NÃO CONFIGURADA!');

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/controle_partidas', mongoOptions)
  .then(() => {
    console.log('✅ MONGODB CONECTADO COM SUCESSO!');
    console.log('📊 Banco de dados:', mongoose.connection.name);
    console.log('🔗 Host:', mongoose.connection.host);
    console.log('👤 Usuário:', mongoose.connection.user);
  })
  .catch((err) => {
    console.error('❌ ERRO NA CONEXÃO MONGODB:');
    console.error('   Código:', err.code);
    console.error('   Mensagem:', err.message);
    console.error('   🛠️ Soluções possíveis:');
    console.error('   1. Verifique senha do usuário "sistema_war"');
    console.error('   2. Confirme IP liberado (0.0.0.0/0) no MongoDB Atlas');
    console.error('   3. Teste a string no MongoDB Compass');
  });

// MODELOS MONGODB - Adicione antes das rotas

const partidaSchema = new mongoose.Schema({
  data: { type: Date, default: Date.now },
  jogadores: [{
    nome: String,
    cor: String,
    territorios: Number,
    exercitos: Number,
    eliminado: Boolean,
    posicao: Number
  }],
  vencedor: String,
  duracao: Number, // em minutos
  pontos: Number,
  torneio: String,
  observacoes: String
});

const jogadorSchema = new mongoose.Schema({
  nome: String,
  email: String,
  ativo: { type: Boolean, default: true },
  data_cadastro: { type: Date, default: Date.now },
  vitorias: { type: Number, default: 0 },
  derrotas: { type: Number, default: 0 }
});

const Partida = mongoose.model('Partida', partidaSchema);
const Jogador = mongoose.model('Jogador', jogadorSchema);

// ROTAS REAIS - Substitua as rotas atuais /api/matches
app.post('/api/partidas', async (req, res) => {
  try {
    const partida = new Partida(req.body);
    await partida.save();
    res.status(201).json({ 
      success: true, 
      message: 'Partida salva com sucesso!',
      partida: partida 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/partidas', async (req, res) => {
  try {
    const partidas = await Partida.find().sort({ data: -1 }).limit(50);
    res.json({ success: true, partidas: partidas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MODELOS MONGODB - Para seu sistema WAR
// ============================================

const jogadorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  apelido: { type: String, required: true, unique: true },
  email: { type: String },
  observacoes: String,
  patente: { type: String, default: 'Cabo 🪖' },
  ativo: { type: Boolean, default: true },
  data_cadastro: { type: Date, default: Date.now },
  vitorias: { type: Number, default: 0 },
  partidas: { type: Number, default: 0 }
});

const partidaSchema = new mongoose.Schema({
  data: { type: Date, default: Date.now },
  tipo: { type: String, default: 'global' },
  vencedor: { type: String, required: true },
  participantes: [{ type: String }], // Array de apelidos
  observacoes: String,
  pontos: { type: Number, default: 100 }
});

const Jogador = mongoose.model('Jogador', jogadorSchema);
const Partida = mongoose.model('Partida', partidaSchema);

// ============================================
// ROTAS DA API - JOGADORES
// ============================================

// GET todos jogadores
app.get('/api/jogadores', async (req, res) => {
  try {
    const jogadores = await Jogador.find({ ativo: true }).sort({ vitorias: -1 });
    res.json({ success: true, jogadores });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST novo jogador
app.post('/api/jogadores', async (req, res) => {
  try {
    const jogador = new Jogador(req.body);
    await jogador.save();
    res.status(201).json({ 
      success: true, 
      message: 'Jogador cadastrado com sucesso!',
      jogador 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DA API - PARTIDAS
// ============================================

// GET todas partidas
app.get('/api/partidas', async (req, res) => {
  try {
    const partidas = await Partida.find().sort({ data: -1 });
    res.json({ success: true, partidas });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST nova partida
app.post('/api/partidas', async (req, res) => {
  try {
    // Atualizar estatísticas do vencedor
    await Jogador.findOneAndUpdate(
      { apelido: req.body.vencedor },
      { 
        $inc: { 
          vitorias: 1,
          partidas: 1 
        }
      }
    );
    
    // Atualizar estatísticas dos participantes
    if (req.body.participantes && Array.isArray(req.body.participantes)) {
      await Jogador.updateMany(
        { 
          apelido: { $in: req.body.participantes },
          apelido: { $ne: req.body.vencedor } // Não atualizar o vencedor de novo
        },
        { $inc: { partidas: 1 } }
      );
    }
    
    const partida = new Partida(req.body);
    await partida.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Partida registrada com sucesso!',
      partida 
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DA API - ESTATÍSTICAS
// ============================================

// GET estatísticas gerais
app.get('/api/estatisticas', async (req, res) => {
  try {
    const totalJogadores = await Jogador.countDocuments({ ativo: true });
    const totalPartidas = await Partida.countDocuments();
    
    // Jogador com mais vitórias
    const recordVitorias = await Jogador.findOne({ ativo: true })
      .sort({ vitorias: -1 })
      .select('apelido vitorias');
    
    // Últimas partidas
    const ultimasPartidas = await Partida.find()
      .sort({ data: -1 })
      .limit(5);
    
    res.json({
      success: true,
      total_jogadores: totalJogadores,
      total_partidas: totalPartidas,
      record_vitorias: recordVitorias ? recordVitorias.vitorias : 0,
      record_holder: recordVitorias ? recordVitorias.apelido : 'N/A',
      ultimas_partidas: ultimasPartidas
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DA API - RANKING
// ============================================

// GET ranking global
app.get('/api/ranking/global', async (req, res) => {
  try {
    const jogadores = await Jogador.find({ ativo: true })
      .sort({ vitorias: -1, partidas: 1 })
      .select('apelido patente vitorias partidas')
      .limit(20);
    
    // Calcular percentual de vitórias
    const ranking = jogadores.map(jogador => ({
      apelido: jogador.apelido,
      patente: jogador.patente,
      vitorias: jogador.vitorias,
      partidas: jogador.partidas,
      percentual: jogador.partidas > 0 ? 
        ((jogador.vitorias / jogador.partidas) * 100).toFixed(1) : 0
    }));
    
    res.json(ranking);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS EXTRAS
// ============================================

// GET dados para dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalJogadores = await Jogador.countDocuments({ ativo: true });
    const totalPartidas = await Partida.countDocuments();
    const ranking = await Jogador.find({ ativo: true })
      .sort({ vitorias: -1 })
      .limit(3)
      .select('apelido vitorias');
    
    res.json({
      success: true,
      total_jogadores: totalJogadores,
      total_partidas: totalPartidas,
      podium: ranking
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
