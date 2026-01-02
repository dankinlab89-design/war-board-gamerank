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

// ============================================
// CONEXÃO MONGODB
// ============================================

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

// ============================================
// MODELOS MONGODB
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
  participantes: [{ type: String }],
  observacoes: String,
  pontos: { type: Number, default: 100 }
});

const Jogador = mongoose.model('Jogador', jogadorSchema);
const Partida = mongoose.model('Partida', partidaSchema);

// ============================================
// FUNÇÕES AUXILIARES PARA RANKINGS
// ============================================

// Função para calcular dados de um jogador
const calcularDadosJogador = (jogador) => {
  const vitorias = jogador.vitorias || 0;
  const partidas = jogador.partidas || 0;
  
  const pontuacao = (vitorias * 10) + (partidas * 2);
  
  const performance = partidas > 0 ? 
    ((vitorias / partidas) * 100) : 0;
  
  const getClassificacao = (percentual) => {
    if (percentual >= 80) return 'IMPARÁVEL';
    if (percentual >= 60) return 'GUERREIRO'; 
    if (percentual >= 40) return 'SOBREVIVENTE';
    if (percentual >= 20) return 'RECRUTA';
    return 'INICIANTE';
  };
  
  return {
    apelido: jogador.apelido,
    patente: jogador.patente || 'Cabo 🪖',
    vitorias,
    partidas,
    pontuacao,
    performance: performance.toFixed(1) + '%',
    classificacao: getClassificacao(performance),
    data_cadastro: jogador.data_cadastro
  };
};

// Função para ordenar RANKING GLOBAL/MENSAL
const ordenarRankingCompetitivo = (a, b) => {
  if (b.vitorias !== a.vitorias) {
    return b.vitorias - a.vitorias;
  }
  
  if (b.pontuacao !== a.pontuacao) {
    return b.pontuacao - a.pontuacao;
  }
  
  const perfA = parseFloat(a.performance);
  const perfB = parseFloat(b.performance);
  if (perfB !== perfA) {
    return perfB - perfA;
  }
  
  return new Date(a.data_cadastro) - new Date(b.data_cadastro);
};

// Função para ordenar RANKING PERFORMANCE
const ordenarRankingPerformance = (a, b) => {
  const perfA = parseFloat(a.performance);
  const perfB = parseFloat(b.performance);
  if (perfB !== perfA) {
    return perfB - perfA;
  }
  
  if (b.vitorias !== a.vitorias) {
    return b.vitorias - a.vitorias;
  }
  
  if (b.pontuacao !== a.pontuacao) {
    return b.pontuacao - a.pontuacao;
  }
  
  return a.apelido.localeCompare(b.apelido);
};

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

// GET jogador específico
app.get('/api/jogadores/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }
    
    const jogador = await Jogador.findById(req.params.id);
    
    if (!jogador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Jogador não encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      jogador 
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar jogador:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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

// PUT atualizar jogador
app.put('/api/jogadores/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }
    
    const jogadorExistente = await Jogador.findById(req.params.id);
    if (!jogadorExistente) {
      return res.status(404).json({ 
        success: false, 
        error: 'Jogador não encontrado' 
      });
    }
    
    const jogador = await Jogador.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { 
        new: true,
        runValidators: true
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Jogador atualizado com sucesso!',
      jogador 
    });
    
  } catch (error) {
    console.error('❌ Erro na atualização:', error.message);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DELETE desativar jogador
app.delete('/api/jogadores/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }
    
    const jogador = await Jogador.findByIdAndUpdate(
      req.params.id,
      { $set: { ativo: false } },
      { new: true }
    );
    
    if (!jogador) {
      return res.status(404).json({ 
        success: false, 
        error: 'Jogador não encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Jogador desativado com sucesso!',
      jogador 
    });
    
  } catch (error) {
    console.error('❌ Erro ao desativar:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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
    
    // Atualizar estatísticas dos participantes (apenas partidas, não vitórias)
    if (req.body.participantes && Array.isArray(req.body.participantes)) {
      const outrosParticipantes = req.body.participantes.filter(p => p !== req.body.vencedor);
      
      if (outrosParticipantes.length > 0) {
        await Jogador.updateMany(
          { apelido: { $in: outrosParticipantes } },
          { $inc: { partidas: 1 } }
        );
      }
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
// ROTAS DE RANKING
// ============================================

// GET ranking global - TODOS OS TEMPOS
app.get('/api/ranking/global', async (req, res) => {
  try {
    const jogadores = await Jogador.find({ ativo: true })
      .select('apelido patente vitorias partidas data_cadastro')
      .lean();
    
    // Calcular dados para cada jogador
    const ranking = jogadores.map(calcularDadosJogador);
    
    // Ordenar por critério competitivo
    ranking.sort(ordenarRankingCompetitivo);
    
    // Adicionar posições
    const resultado = ranking.map((jogador, index) => ({
      posicao: index + 1,
      ...jogador,
      tipo: 'global'
    }));
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no ranking global:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ranking mensal - MÊS ATUAL
app.get('/api/ranking/mensal', async (req, res) => {
  try {
    // Obter início e fim do mês atual
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    
    const mesNome = inicioMes.toLocaleDateString('pt-BR', { month: 'long' });
    
    // Buscar TODOS jogadores ativos
    const todosJogadores = await Jogador.find({ ativo: true })
      .select('apelido patente vitorias partidas data_cadastro')
      .lean();
    
    // Buscar partidas deste mês
    const partidasMes = await Partida.find({
      data: { $gte: inicioMes, $lte: fimMes }
    }).lean();
    
    // Calcular estatísticas APENAS das partidas do mês
    const estatisticasMes = {};
    
    // Inicializar todos jogadores com zero no mês
    todosJogadores.forEach(jogador => {
      estatisticasMes[jogador.apelido] = {
        vitorias_mes: 0,
        partidas_mes: 0,
        jogador
      };
    });
    
    // Contar vitórias e partidas do mês
    partidasMes.forEach(partida => {
      if (estatisticasMes[partida.vencedor]) {
        estatisticasMes[partida.vencedor].vitorias_mes += 1;
      }
      
      partida.participantes.forEach(participante => {
        if (estatisticasMes[participante]) {
          estatisticasMes[participante].partidas_mes += 1;
        }
      });
    });
    
    // Converter para array e calcular pontuação do mês
    const rankingMensal = Object.values(estatisticasMes)
      .filter(item => item.partidas_mes > 0)
      .map(item => {
        const dados = calcularDadosJogador(item.jogador);
        
        return {
          ...dados,
          vitorias: item.vitorias_mes,
          partidas: item.partidas_mes,
          pontuacao: (item.vitorias_mes * 10) + (item.partidas_mes * 2),
          performance: item.partidas_mes > 0 ? 
            ((item.vitorias_mes / item.partidas_mes) * 100).toFixed(1) + '%' : '0%'
        };
      });
    
    // Ordenar por critério competitivo
    rankingMensal.sort(ordenarRankingCompetitivo);
    
    // Adicionar posições e informações do mês
    const resultado = rankingMensal.map((jogador, index) => ({
      posicao: index + 1,
      ...jogador,
      tipo: 'mensal',
      mes: agora.getMonth() + 1,
      ano: agora.getFullYear(),
      periodo: `${mesNome} ${agora.getFullYear()}`
    }));
    
    // Se não houver partidas no mês, retornar vazio com mensagem
    if (resultado.length === 0) {
      return res.json([{
        mensagem: `Nenhuma partida registrada em ${mesNome} ${agora.getFullYear()}`,
        periodo: `${mesNome} ${agora.getFullYear()}`
      }]);
    }
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no ranking mensal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ranking de performance - ORDENADO POR % VITÓRIAS
app.get('/api/ranking/performance', async (req, res) => {
  try {
    const jogadores = await Jogador.find({ ativo: true })
      .select('apelido patente vitorias partidas data_cadastro')
      .lean();
    
    // Calcular dados para cada jogador
    const ranking = jogadores.map(calcularDadosJogador);
    
    // Filtrar apenas quem tem partidas
    const rankingComPartidas = ranking.filter(j => j.partidas > 0);
    
    // Ordenar por critério de performance
    rankingComPartidas.sort(ordenarRankingPerformance);
    
    // Adicionar posições
    const resultado = rankingComPartidas.map((jogador, index) => ({
      posicao: index + 1,
      ...jogador,
      tipo: 'performance'
    }));
    
    // Adicionar jogadores sem partidas no final
    const rankingSemPartidas = ranking.filter(j => j.partidas === 0)
      .map(jogador => ({
        posicao: '-',
        ...jogador,
        performance: 'N/A',
        classificacao: 'SEM PARTIDAS',
        tipo: 'performance'
      }));
    
    const resultadoFinal = [...resultado, ...rankingSemPartidas];
    
    res.json(resultadoFinal);
    
  } catch (error) {
    console.error('❌ Erro no ranking performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET vencedores históricos mensais
app.get('/api/ranking/historico-mensal', async (req, res) => {
  try {
    const partidas = await Partida.find().sort({ data: 1 }).lean();
    
    const historico = {};
    
    partidas.forEach(partida => {
      const data = new Date(partida.data);
      const chave = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      const mesNome = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      if (!historico[chave]) {
        historico[chave] = {
          mes: mesNome,
          ano: data.getFullYear(),
          mesNumero: data.getMonth() + 1,
          partidas: [],
          vitorias: {}
        };
      }
      
      historico[chave].partidas.push(partida._id);
      
      if (!historico[chave].vitorias[partida.vencedor]) {
        historico[chave].vitorias[partida.vencedor] = 0;
      }
      historico[chave].vitorias[partida.vencedor]++;
    });
    
    const resultado = Object.entries(historico).map(([chave, dados]) => {
      let vencedor = '';
      let maxVitorias = 0;
      
      Object.entries(dados.vitorias).forEach(([jogador, vitorias]) => {
        if (vitorias > maxVitorias) {
          maxVitorias = vitorias;
          vencedor = jogador;
        }
      });
      
      return {
        periodo: dados.mes,
        ano: dados.ano,
        mes: dados.mesNumero,
        total_partidas: dados.partidas.length,
        vencedor,
        vitorias: maxVitorias,
        participantes: Object.keys(dados.vitorias).length
      };
    });
    
    resultado.sort((a, b) => {
      if (b.ano !== a.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no histórico mensal:', error);
    res.status(500).json({ success: false, error: error.message });
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
    
    const recordVitorias = await Jogador.findOne({ ativo: true })
      .sort({ vitorias: -1 })
      .select('apelido vitorias partidas');
    
    let pontuacaoRecord = 0;
    if (recordVitorias) {
      pontuacaoRecord = (recordVitorias.vitorias * 10) + (recordVitorias.partidas * 2);
    }
    
    const ultimasPartidas = await Partida.find()
      .sort({ data: -1 })
      .limit(5);
    
    const rankingsInfo = {
      global: { endpoint: '/api/ranking/global', descricao: 'Ranking histórico geral' },
      mensal: { endpoint: '/api/ranking/mensal', descricao: 'Ranking do mês atual' },
      performance: { endpoint: '/api/ranking/performance', descricao: 'Ranking por eficiência' }
    };
    
    res.json({
      success: true,
      total_jogadores: totalJogadores,
      total_partidas: totalPartidas,
      record: {
        jogador: recordVitorias ? recordVitorias.apelido : 'N/A',
        vitorias: recordVitorias ? recordVitorias.vitorias : 0,
        pontuacao: pontuacaoRecord,
        partidas: recordVitorias ? recordVitorias.partidas : 0
      },
      sistema_pontos: {
        vitoria: 10,
        participacao: 2,
        formula: '(vitórias × 10) + (partidas × 2)'
      },
      rankings: rankingsInfo,
      ultimas_partidas: ultimasPartidas
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DE TESTE E HEALTH
// ============================================

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({ 
    status: 'online',
    database: statusMap[dbStatus] || 'unknown',
    message: 'War Board API funcionando!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', async (req, res) => {
  try {
    const jogadoresCount = await Jogador.countDocuments();
    const partidasCount = await Partida.countDocuments();
    
    res.json({
      success: true,
      jogadores: jogadoresCount,
      partidas: partidasCount,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS PARA PÁGINAS HTML
// ============================================

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

app.get('/cadastro', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cadastro.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Rota catch-all para SPA
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`📁 Frontend servido de: ${path.join(__dirname, '../public')}`);
  console.log(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Aguardando...'}`);
  console.log(`🌍 CORS permitindo: ${allowedOrigins.join(', ')}`);
  console.log(`🔗 API Endpoints disponíveis:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/jogadores`);
  console.log(`   POST /api/jogadores`);
  console.log(`   GET  /api/partidas`);
  console.log(`   POST /api/partidas`);
  console.log(`   GET  /api/estatisticas`);
  console.log(`   GET  /api/ranking/global`);
  console.log(`   GET  /api/dashboard`);
});
