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
// NOVOS MODELOS MONGODB PARA AS FUNCIONALIDADES
// ============================================

// Schema para Vencedores Mensais (funcionalidade 3)
const vencedorMensalSchema = new mongoose.Schema({
  ano: { type: Number, required: true },
  mes: { type: Number, required: true }, // 1-12
  jogador_apelido: { type: String, required: true },
  vitorias: { type: Number, required: true },
  partidas: { type: Number, required: true },
  patente: { type: String, default: 'Cabo 🪖' },
  data_registro: { type: Date, default: Date.now }
});

// Schema para Estatísticas Avançadas (funcionalidades 1 e 4)
const estatisticaSchema = new mongoose.Schema({
  tipo: { type: String, required: true, unique: true }, // Ex: 'record_consecutivo', 'crescimento_jogadores'
  valor: mongoose.Schema.Types.Mixed, // Pode ser número, string, objeto
  jogador_associado: String,
  data_atualizacao: { type: Date, default: Date.now }
});

// Schema para Participação (gráfico de assiduidade)
const participacaoSchema = new mongoose.Schema({
  jogador_apelido: { type: String, required: true },
  mes_ano: { type: String, required: true }, // Formato: "MM/YYYY"
  participacoes: { type: Number, default: 0 },
  vitorias: { type: Number, default: 0 }
});

// Criar os modelos
const VencedorMensal = mongoose.model('VencedorMensal', vencedorMensalSchema);
const Estatistica = mongoose.model('Estatistica', estatisticaSchema);
const Participacao = mongoose.model('Participacao', participacaoSchema);

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

// GET partida específica
app.get('/api/partidas/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }
    
    const partida = await Partida.findById(req.params.id);
    
    if (!partida) {
      return res.status(404).json({ 
        success: false, 
        error: 'Partida não encontrada' 
      });
    }
    
    res.json({ 
      success: true, 
      partida 
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar partida:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// PUT atualizar partida
app.put('/api/partidas/:id', async (req, res) => {
  try {
    console.log('📝 Atualizando partida ID:', req.params.id);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }
    
    // Verificar se partida existe
    const partidaExistente = await Partida.findById(req.params.id);
    if (!partidaExistente) {
      return res.status(404).json({ 
        success: false, 
        error: 'Partida não encontrada' 
      });
    }
    
    // IMPORTANTE: Se mudou o vencedor, precisamos ajustar estatísticas
    if (req.body.vencedor && req.body.vencedor !== partidaExistente.vencedor) {
      // Remover vitória do vencedor antigo
      await Jogador.findOneAndUpdate(
        { apelido: partidaExistente.vencedor },
        { $inc: { vitorias: -1 } }
      );
      
      // Adicionar vitória ao novo vencedor
      await Jogador.findOneAndUpdate(
        { apelido: req.body.vencedor },
        { $inc: { vitorias: 1 } }
      );
    }
    
    // Atualizar partida
    const partida = await Partida.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { 
        new: true,           // Retorna o documento atualizado
        runValidators: true  // Valida os dados
      }
    );
    
    console.log('✅ Partida atualizada:', partida._id);
    
    res.json({ 
      success: true, 
      message: 'Partida atualizada com sucesso!',
      partida 
    });
    
  } catch (error) {
    console.error('❌ Erro na atualização da partida:', error.message);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DELETE excluir partida
app.delete('/api/partidas/:id', async (req, res) => {
  try {
    console.log('🗑️ Excluindo partida ID:', req.params.id);
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }
    
    const partida = await Partida.findById(req.params.id);
    
    if (!partida) {
      return res.status(404).json({ 
        success: false, 
        error: 'Partida não encontrada' 
      });
    }
    
    // IMPORTANTE: Reverter estatísticas dos jogadores
    // Remover vitória do vencedor
    await Jogador.findOneAndUpdate(
      { apelido: partida.vencedor },
      { $inc: { vitorias: -1, partidas: -1 } }
    );
    
    // Remover partidas dos outros participantes
    if (partida.participantes && Array.isArray(partida.participantes)) {
      const outrosParticipantes = partida.participantes.filter(p => p !== partida.vencedor);
      
      if (outrosParticipantes.length > 0) {
        await Jogador.updateMany(
          { apelido: { $in: outrosParticipantes } },
          { $inc: { partidas: -1 } }
        );
      }
    }
    
    // Excluir partida
    await Partida.findByIdAndDelete(req.params.id);
    
    console.log('✅ Partida excluída:', partida._id);
    
    res.json({ 
      success: true, 
      message: 'Partida excluída com sucesso!',
      partida 
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir partida:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ... (código anterior mantido igual até as rotas de ranking)

// ============================================
// ROTAS DE RANKING
// ============================================

// GET ranking global - TODOS OS TEMPOS
app.get('/api/ranking/global', async (req, res) => {
  try {
    console.log('📊 Gerando ranking GLOBAL...');
    
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
    
    console.log('✅ Ranking global gerado com', resultado.length, 'jogadores');
    
    // HEADER para evitar cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no ranking global:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ranking mensal - COM PARÂMETROS ANO/MÊS
app.get('/api/ranking/mensal/:ano?/:mes?', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano) || new Date().getFullYear();
    const mes = parseInt(req.params.mes) || new Date().getMonth() + 1;
    
    // Validar parâmetros
    if (ano < 2000 || ano > 2100 || mes < 1 || mes > 12) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ano ou mês inválido. Use ano entre 2000-2100 e mês 1-12' 
      });
    }
    
    // Obter início e fim do mês especificado
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59);
    
    const mesNome = inicioMes.toLocaleDateString('pt-BR', { month: 'long' });
    console.log(`📅 Ranking MENSAL: ${mesNome} ${ano}`);
    
    // Buscar TODOS jogadores ativos
    const todosJogadores = await Jogador.find({ ativo: true })
      .select('apelido patente vitorias partidas data_cadastro')
      .lean();
    
    // Buscar partidas deste mês
    const partidasMes = await Partida.find({
      data: { $gte: inicioMes, $lte: fimMes }
    }).lean();
    
    console.log(`🎮 ${partidasMes.length} partidas encontradas no mês`);
    
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
      
      if (partida.participantes && Array.isArray(partida.participantes)) {
        partida.participantes.forEach(participante => {
          if (estatisticasMes[participante]) {
            estatisticasMes[participante].partidas_mes += 1;
          }
        });
      }
    });
    
    // Converter para array e calcular pontuação do mês
    const rankingMensal = Object.values(estatisticasMes)
      .filter(item => item.partidas_mes > 0)
      .map(item => {
        const dados = calcularDadosJogador(item.jogador);
        
        // Calcular performance do mês
        const performanceMes = item.partidas_mes > 0 ? 
          ((item.vitorias_mes / item.partidas_mes) * 100) : 0;
        
        // Classificação baseada no performance do mês
        const getClassificacaoMes = (percentual) => {
          if (percentual >= 80) return 'IMPARÁVEL';
          if (percentual >= 60) return 'GUERREIRO'; 
          if (percentual >= 40) return 'SOBREVIVENTE';
          if (percentual >= 20) return 'RECRUTA';
          return 'INICIANTE';
        };
        
        return {
          apelido: item.jogador.apelido,
          patente: item.jogador.patente || 'Cabo 🪖',
          vitorias: item.vitorias_mes,
          partidas: item.partidas_mes,
          pontuacao: (item.vitorias_mes * 10) + (item.partidas_mes * 2),
          performance: performanceMes.toFixed(1) + '%',
          classificacao: getClassificacaoMes(performanceMes),
          tipo: 'mensal'
        };
      });
    
    // Ordenar por critério competitivo
    rankingMensal.sort(ordenarRankingCompetitivo);
    
    // Adicionar posições e informações do mês
    const resultado = rankingMensal.map((jogador, index) => ({
      posicao: index + 1,
      ...jogador,
      mes: mes,
      ano: ano,
      periodo: `${mesNome} ${ano}`,
      total_jogadores: rankingMensal.length,
      total_partidas: partidasMes.length
    }));
    
    console.log(`🏆 ${resultado.length} jogadores no ranking mensal`);
    
    // Se não houver partidas no mês, retornar array vazio
    if (resultado.length === 0) {
      return res.json([]);
    }
    
    // HEADER para evitar cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no ranking mensal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA ALTERNATIVA para ranking mensal (sem parâmetros - mês atual)
app.get('/api/ranking/mensal', async (req, res) => {
  try {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth() + 1;
    
    // Redirecionar para a rota com parâmetros
    res.redirect(`/api/ranking/mensal/${ano}/${mes}`);
    
  } catch (error) {
    console.error('❌ Erro no ranking mensal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET ranking de performance - ORDENADO POR % VITÓRIAS
app.get('/api/ranking/performance', async (req, res) => {
  try {
    console.log('📈 Gerando ranking PERFORMANCE...');
    
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
    
    console.log(`✅ Ranking performance: ${resultado.length} com partidas, ${rankingSemPartidas.length} sem partidas`);
    
    // HEADER para evitar cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(resultadoFinal);
    
  } catch (error) {
    console.error('❌ Erro no ranking performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET vencedores históricos mensais
app.get('/api/ranking/historico-mensal', async (req, res) => {
  try {
    console.log('📚 Gerando histórico mensal...');
    
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
    
    console.log(`✅ Histórico com ${resultado.length} meses registrados`);
    
    // HEADER para evitar cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no histórico mensal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DA API - ESTATÍSTICAS (MELHORADA)
// ============================================

// GET estatísticas gerais
app.get('/api/estatisticas', async (req, res) => {
  try {
    console.log('📊 Gerando estatísticas...');
    
    const totalJogadores = await Jogador.countDocuments({ ativo: true });
    const totalPartidas = await Partida.countDocuments();
    
    // Jogador com mais vitórias
    const recordVitorias = await Jogador.findOne({ ativo: true })
      .sort({ vitorias: -1 })
      .select('apelido vitorias partidas patente');
    
    // Calcular pontuação do recordista
    let pontuacaoRecord = 0;
    if (recordVitorias) {
      pontuacaoRecord = (recordVitorias.vitorias * 10) + (recordVitorias.partidas * 2);
    }
    
    // Últimas partidas
    const ultimasPartidas = await Partida.find()
      .sort({ data: -1 })
      .limit(5)
      .lean();
    
    // Top 3 jogadores por pontuação
    const jogadores = await Jogador.find({ ativo: true })
      .select('apelido vitorias partidas patente')
      .lean();
    
    const jogadoresComPontuacao = jogadores.map(jogador => {
      const pontuacao = (jogador.vitorias * 10) + (jogador.partidas * 2);
      return {
        ...jogador,
        pontuacao: pontuacao
      };
    });
    
    jogadoresComPontuacao.sort((a, b) => b.pontuacao - a.pontuacao);
    const top3Pontuacao = jogadoresComPontuacao.slice(0, 3);
    
    // Partidas do mês atual
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    
    const partidasMes = await Partida.countDocuments({
      data: { $gte: inicioMes, $lte: fimMes }
    });
    
    const response = {
      success: true,
      total_jogadores: totalJogadores,
      total_partidas: totalPartidas,
      partidas_mes_atual: partidasMes,
      record: {
        jogador: recordVitorias ? recordVitorias.apelido : 'N/A',
        vitorias: recordVitorias ? recordVitorias.vitorias : 0,
        pontuacao: pontuacaoRecord,
        partidas: recordVitorias ? recordVitorias.partidas : 0,
        patente: recordVitorias ? recordVitorias.patente : 'N/A'
      },
      top3_pontuacao: top3Pontuacao.map((j, index) => ({
        posicao: index + 1,
        apelido: j.apelido,
        patente: j.patente,
        pontuacao: j.pontuacao,
        vitorias: j.vitorias,
        partidas: j.partidas
      })),
      sistema_pontos: {
        vitoria: 10,
        participacao: 2,
        formula: '(vitórias × 10) + (partidas × 2)'
      },
      ultimas_partidas: ultimasPartidas
    };
    
    console.log('✅ Estatísticas geradas');
    
    // HEADER para evitar cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erro nas estatísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTA ESPECÍFICA PARA DASHBOARD
// ============================================

app.get('/api/dashboard', async (req, res) => {
  try {
    console.log('📊 Gerando dados do dashboard...');
    
    const [totalJogadores, totalPartidas] = await Promise.all([
      Jogador.countDocuments({ ativo: true }),
      Partida.countDocuments()
    ]);
    
    // Buscar jogadores para calcular pontuação
    const jogadores = await Jogador.find({ ativo: true })
      .select('apelido vitorias partidas patente')
      .lean();
    
    // Calcular pontuação para cada jogador
    const jogadoresComPontuacao = jogadores.map(jogador => {
      const pontuacao = (jogador.vitorias * 10) + (jogador.partidas * 2);
      const performance = jogador.partidas > 0 ? 
        ((jogador.vitorias / jogador.partidas) * 100) : 0;
      
      return {
        ...jogador,
        pontuacao: pontuacao,
        performance: performance.toFixed(1) + '%'
      };
    });
    
    // Ordenar por pontuação
    jogadoresComPontuacao.sort((a, b) => b.pontuacao - a.pontuacao);
    const top3 = jogadoresComPontuacao.slice(0, 3);
    
    // Últimas partidas
    const ultimasPartidas = await Partida.find()
      .sort({ data: -1 })
      .limit(5)
      .lean();
    
    // Média de partidas por jogador
    const mediaPartidas = totalJogadores > 0 ? 
      (totalPartidas / totalJogadores).toFixed(1) : 0;
    
    const response = {
      success: true,
      total_jogadores: totalJogadores,
      total_partidas: totalPartidas,
      media_partidas: mediaPartidas,
      podium: top3,
      ultimas_partidas: ultimasPartidas,
      sistema_pontos: {
        vitoria: 10,
        participacao: 2,
        formula: '(vitórias × 10) + (partidas × 2)'
      }
    };
    
    console.log('✅ Dados do dashboard gerados');
    
    // HEADER para evitar cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erro no dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DA API - ESTATÍSTICAS AVANÇADAS
// ============================================

// GET estatísticas gerais do dashboard (funcionalidade 1)
app.get('/api/estatisticas/dashboard', async (req, res) => {
  try {
    const totalJogadores = await Jogador.countDocuments({ ativo: true });
    const totalPartidas = await Partida.countDocuments();
    
    // Buscar jogador com mais vitórias (recordista)
    const recordista = await Jogador.findOne({ ativo: true })
      .sort({ vitorias: -1 })
      .select('apelido vitorias');
    
    // Calcular recorde de vitórias consecutivas
    const recordConsecutivoDoc = await Estatistica.findOne({ tipo: 'record_consecutivo' });
    
    // Calcular crescimento mensal
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const partidasEsteMes = await Partida.countDocuments({
      data: { $gte: primeiroDiaMes }
    });
    
    const percentualMes = totalPartidas > 0 ? 
      Math.round((partidasEsteMes / totalPartidas) * 100) : 0;
    
    // Média de vitórias por jogador
    const jogadoresAtivos = await Jogador.find({ ativo: true });
    const totalVitorias = jogadoresAtivos.reduce((sum, j) => sum + (j.vitorias || 0), 0);
    const mediaVitorias = totalJogadores > 0 ? 
      (totalVitorias / totalJogadores).toFixed(1) : 0;
    
    res.json({
      success: true,
      estatisticas: {
        total_jogadores: totalJogadores,
        total_partidas: totalPartidas,
        record_vitorias: recordista?.vitorias || 0,
        record_holder: recordista?.apelido || '-',
        record_consecutivo: recordConsecutivoDoc?.valor?.max_consecutivo || 0,
        record_holder_consecutivo: recordConsecutivoDoc?.valor?.jogador_apelido || '-',
        partidas_mes_atual: partidasEsteMes,
        percentual_mes: percentualMes,
        total_vitorias: totalVitorias,
        media_vitorias: mediaVitorias,
        crescimento_jogadores: 0 // Você pode calcular baseado no histórico
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET distribuição real de patentes (gráfico - funcionalidade 2)
app.get('/api/estatisticas/patentes-reais', async (req, res) => {
  try {
    const distribuicao = await Jogador.aggregate([
      { $match: { ativo: true } },
      { $group: { 
        _id: '$patente', 
        quantidade: { $sum: 1 } 
      }},
      { $sort: { quantidade: -1 } }
    ]);
    
    // Formatar para o gráfico
    const dadosFormatados = {};
    distribuicao.forEach(item => {
      dadosFormatados[item._id] = item.quantidade;
    });
    
    res.json({ success: true, distribuicao: dadosFormatados });
    
  } catch (error) {
    console.error('❌ Erro ao buscar distribuição de patentes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET assiduidade/participação real (gráfico - funcionalidade 2)
app.get('/api/estatisticas/assiduidade-real', async (req, res) => {
  try {
    // Usar o schema de Participação ou calcular dinamicamente
    const participacao = await Participacao.aggregate([
      { $sort: { participacoes: -1 } },
      { $limit: 10 }
    ]);
    
    // Se não houver dados no schema Participacao, calcular das partidas
    if (!participacao || participacao.length === 0) {
      const jogadores = await Jogador.find({ ativo: true })
        .sort({ partidas: -1 })
        .limit(10)
        .select('apelido partidas vitorias');
      
      const dadosFormatados = jogadores.map(j => ({
        apelido: j.apelido,
        participacoes: j.partidas || 0,
        vitorias: j.vitorias || 0
      }));
      
      return res.json({ success: true, participacao: dadosFormatados });
    }
    
    res.json({ success: true, participacao });
    
  } catch (error) {
    console.error('❌ Erro ao buscar assiduidade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DA API - VENCEDORES MENSAIS
// ============================================

// GET vencedores por ano (funcionalidade 3)
app.get('/api/vencedores/mensal/:ano', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano);
    
    if (ano === 2025) {
      // Para 2025, retornar dados fixos conforme solicitado
      return res.json({
        success: true,
        ano: 2025,
        tipo: 'ranking_anual',
        vencedores: [
          { posicao: 1, apelido: 'NEY2003', vitorias: 30, partidas: 0 },
          { posicao: 2, apelido: 'PetroIdeal', vitorias: 22, partidas: 0 },
          { posicao: 2, apelido: 'Daniel$80', vitorias: 22, partidas: 0 },
          { posicao: 3, apelido: 'TucaRei', vitorias: 21, partidas: 0 }
        ]
      });
    }
    
    // Para outros anos, buscar do banco
    const vencedores = await VencedorMensal.find({ ano })
      .sort({ mes: 1 })
      .select('ano mes jogador_apelido vitorias partidas patente');
    
    res.json({
      success: true,
      ano,
      tipo: 'mensal',
      vencedores
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar vencedores mensais:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST registrar vencedor do mês (rodar automaticamente no dia 1)
app.post('/api/vencedores/registrar-mensal', async (req, res) => {
  try {
    const hoje = new Date();
    const mesPassado = hoje.getMonth(); // Janeiro = 0
    const ano = hoje.getFullYear();
    
    const mesReferencia = mesPassado === 0 ? 12 : mesPassado;
    const anoReferencia = mesPassado === 0 ? ano - 1 : ano;
    
    console.log(`📅 Registrando vencedor do mês: ${mesReferencia}/${anoReferencia}`);
    
    // Buscar ranking do mês anterior
    const primeiroDiaMes = new Date(anoReferencia, mesReferencia - 1, 1);
    const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0);
    
    // Agregação para encontrar vencedor do mês
    const resultado = await Partida.aggregate([
      { 
        $match: { 
          data: { 
            $gte: primeiroDiaMes,
            $lte: ultimoDiaMes
          }
        }
      },
      { $unwind: '$participantes' },
      {
        $group: {
          _id: '$participantes',
          vitorias: {
            $sum: {
              $cond: [{ $eq: ['$vencedor', '$participantes'] }, 1, 0]
            }
          },
          partidas: { $sum: 1 }
        }
      },
      { $sort: { vitorias: -1, partidas: -1 } },
      { $limit: 1 }
    ]);
    
    if (resultado.length > 0) {
      const vencedor = resultado[0];
      
      // Buscar patente do jogador
      const jogador = await Jogador.findOne({ apelido: vencedor._id });
      
      // Registrar vencedor mensal
      const vencedorMensal = new VencedorMensal({
        ano: anoReferencia,
        mes: mesReferencia,
        jogador_apelido: vencedor._id,
        vitorias: vencedor.vitorias,
        partidas: vencedor.partidas,
        patente: jogador?.patente || 'Cabo 🪖'
      });
      
      await vencedorMensal.save();
      
      console.log(`✅ Vencedor registrado: ${vencedor._id} com ${vencedor.vitorias} vitórias`);
      
      res.json({
        success: true,
        message: `Vencedor do mês ${mesReferencia}/${anoReferencia} registrado`,
        vencedor: vencedorMensal
      });
    } else {
      console.log(`ℹ️ Nenhuma partida no mês ${mesReferencia}/${anoReferencia}`);
      res.json({
        success: true,
        message: `Nenhuma partida no mês ${mesReferencia}/${anoReferencia}`,
        vencedor: null
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao registrar vencedor mensal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS DA API - RANKINGS/PÓDIOS
// ============================================

// GET pódio global (top 3)
app.get('/api/podios/global', async (req, res) => {
  try {
    const jogadores = await Jogador.find({ ativo: true })
      .sort({ vitorias: -1, partidas: -1 })
      .limit(3)
      .select('apelido patente vitorias partidas');
    
    res.json({
      success: true,
      tipo: 'global',
      podio: jogadores
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar pódio global:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET pódio mensal (top 3 do mês atual)
app.get('/api/podios/mensal', async (req, res) => {
  try {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    // Agregação complexa para ranking mensal
    const resultado = await Partida.aggregate([
      { 
        $match: { 
          data: { $gte: primeiroDiaMes }
        }
      },
      { $unwind: '$participantes' },
      {
        $group: {
          _id: '$participantes',
          vitorias: {
            $sum: {
              $cond: [{ $eq: ['$vencedor', '$participantes'] }, 1, 0]
            }
          },
          partidas: { $sum: 1 }
        }
      },
      { $sort: { vitorias: -1, partidas: -1 } },
      { $limit: 3 }
    ]);
    
    // Buscar informações adicionais dos jogadores
    const podioCompleto = await Promise.all(
      resultado.map(async (item) => {
        const jogador = await Jogador.findOne({ apelido: item._id })
          .select('apelido patente');
        
        return {
          apelido: item._id,
          patente: jogador?.patente || 'Cabo 🪖',
          vitorias: item.vitorias,
          partidas: item.partidas
        };
      })
    );
    
    res.json({
      success: true,
      tipo: 'mensal',
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear(),
      podio: podioCompleto
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar pódio mensal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET pódio performance (top 3 por % de vitórias)
app.get('/api/podios/performance', async (req, res) => {
  try {
    const jogadores = await Jogador.find({ 
      ativo: true,
      partidas: { $gte: 3 } // Mínimo 3 partidas para calcular performance
    });
    
    // Calcular performance para cada jogador
    const jogadoresComPerformance = jogadores.map(jogador => {
      const vitorias = jogador.vitorias || 0;
      const partidas = jogador.partidas || 0;
      const performance = partidas > 0 ? (vitorias / partidas) * 100 : 0;
      
      return {
        apelido: jogador.apelido,
        patente: jogador.patente,
        vitorias,
        partidas,
        performance: performance.toFixed(1)
      };
    });
    
    // Ordenar por performance
    jogadoresComPerformance.sort((a, b) => parseFloat(b.performance) - parseFloat(a.performance));
    
    // Top 3
    const podio = jogadoresComPerformance.slice(0, 3);
    
    res.json({
      success: true,
      tipo: 'performance',
      podio
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar pódio performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FUNÇÃO PARA CALCULAR RECORDE CONSECUTIVO (COM DESEMPATE)
// ============================================

async function calcularRecordeConsecutivo() {
  try {
    console.log('🔍 Calculando recorde de vitórias consecutivas...');
    
    // 1. Buscar TODOS os jogadores ativos
    const jogadores = await Jogador.find({ ativo: true }).select('apelido vitorias partidas');
    
    let candidatosRecorde = []; // Array para armazenar todos os candidatos
    
    for (const jogador of jogadores) {
      // 2. Buscar partidas do jogador ordenadas por data
      const partidasJogador = await Partida.find({
        participantes: jogador.apelido
      }).sort({ data: 1 });
      
      // 3. Calcular maior sequência de vitórias
      let consecutivoAtual = 0;
      let maxConsecutivoJogador = 0;
      
      for (const partida of partidasJogador) {
        if (partida.vencedor === jogador.apelido) {
          consecutivoAtual++;
          maxConsecutivoJogador = Math.max(maxConsecutivoJogador, consecutivoAtual);
        } else {
          consecutivoAtual = 0; // Resetar sequência
        }
      }
      
      // 4. Adicionar jogador à lista de candidatos se tiver sequência
      if (maxConsecutivoJogador > 0) {
        candidatosRecorde.push({
          apelido: jogador.apelido,
          maxConsecutivo: maxConsecutivoJogador,
          totalPartidas: jogador.partidas || 0,
          totalVitorias: jogador.vitorias || 0
        });
        
        console.log(`📊 ${jogador.apelido}: ${maxConsecutivoJogador} vitórias seguidas (${jogador.partidas} partidas totais)`);
      }
    }
    
    // 5. ENCONTRAR O VENCEDOR COM CRITÉRIO DE DESEMPATE
    let maxConsecutivo = 0;
    let recordHolder = '-';
    let dadosVencedor = null;
    
    if (candidatosRecorde.length > 0) {
      // Primeiro: ordenar por maior sequência (decrescente)
      candidatosRecorde.sort((a, b) => b.maxConsecutivo - a.maxConsecutivo);
      
      // Encontrar a maior sequência
      const maiorSequencia = candidatosRecorde[0].maxConsecutivo;
      
      // Filtrar jogadores com esta sequência (pode haver empate)
      const empatados = candidatosRecorde.filter(j => j.maxConsecutivo === maiorSequencia);
      
      console.log(`🏆 Maior sequência: ${maiorSequencia} vitórias`);
      console.log(`🤝 Jogadores empatados:`, empatados.map(e => e.apelido));
      
      if (empatados.length === 1) {
        // Caso 1: Apenas um jogador tem esta sequência
        recordHolder = empatados[0].apelido;
        maxConsecutivo = maiorSequencia;
        dadosVencedor = empatados[0];
      } else {
        // Caso 2: Empate na sequência → APLICAR CRITÉRIO DE DESEMPATE
        console.log('⚖️ Aplicando critério de desempate...');
        
        // Critério de desempate: quem tem MAIS PARTIDAS totais
        empatados.sort((a, b) => b.totalPartidas - a.totalPartidas);
        
        // Se ainda houver empate (mesmo número de partidas), usar mais vitórias totais
        if (empatados[0].totalPartidas === empatados[1]?.totalPartidas) {
          console.log('⚖️ Empate em partidas, usando vitórias totais...');
          empatados.sort((a, b) => b.totalVitorias - a.totalVitorias);
        }
        
        recordHolder = empatados[0].apelido;
        maxConsecutivo = maiorSequencia;
        dadosVencedor = empatados[0];
        
        console.log(`✅ Vencedor após desempate: ${recordHolder}`);
        console.log(`   - Sequência: ${maxConsecutivo} vitórias`);
        console.log(`   - Partidas: ${dadosVencedor.totalPartidas}`);
        console.log(`   - Vitórias totais: ${dadosVencedor.totalVitorias}`);
      }
    } else {
      console.log('📭 Nenhum jogador com sequência de vitórias encontrada');
    }
    
    // 6. Salvar no banco de estatísticas
    await Estatistica.findOneAndUpdate(
      { tipo: 'record_consecutivo' },
      { 
        valor: { 
          max_consecutivo: maxConsecutivo,
          jogador_apelido: recordHolder,
          total_partidas: dadosVencedor?.totalPartidas || 0,
          total_vitorias: dadosVencedor?.totalVitorias || 0
        },
        jogador_associado: recordHolder,
        data_atualizacao: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Recorde salvo: ${recordHolder} com ${maxConsecutivo} vitórias seguidas`);
    
    return { 
      maxConsecutivo, 
      recordHolder,
      candidatos: candidatosRecorde 
    };
    
  } catch (error) {
    console.error('❌ Erro ao calcular recorde consecutivo:', error);
    return { maxConsecutivo: 0, recordHolder: '-' };
  }
}

// ROTA DE TESTE PARA VERIFICAR CÁLCULO
app.get('/api/teste-recorde', async (req, res) => {
  try {
    const resultado = await calcularRecordeConsecutivo();
    
    // Buscar estatísticas salvas
    const estatisticaSalva = await Estatistica.findOne({ 
      tipo: 'record_consecutivo' 
    });
    
    res.json({
      sucesso: true,
      calculo: resultado,
      salvoNoBanco: estatisticaSalva?.valor,
      jogadores: await Jogador.find({ ativo: true }).select('apelido vitorias partidas')
    });
  } catch (error) {
    res.status(500).json({ sucesso: false, error: error.message });
  }
});

// ============================================
// ROTA PARA ATUALIZAR ESTATÍSTICAS
// ============================================

app.post('/api/estatisticas/atualizar', async (req, res) => {
  try {
    // Calcular e salvar recorde consecutivo
    const recorde = await calcularRecordeConsecutivo();
    
    // Atualizar participações mensais
    await atualizarParticipacoesMensais();
    
    res.json({
      success: true,
      message: 'Estatísticas atualizadas com sucesso',
      recorde_consecutivo: recorde
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar estatísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function atualizarParticipacoesMensais() {
  try {
    const hoje = new Date();
    const mesAno = `${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
    
    const jogadores = await Jogador.find({ ativo: true });
    
    for (const jogador of jogadores) {
      // Contar partidas deste mês
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const partidasMes = await Partida.countDocuments({
        participantes: jogador.apelido,
        data: { $gte: primeiroDiaMes }
      });
      
      const vitoriasMes = await Partida.countDocuments({
        vencedor: jogador.apelido,
        data: { $gte: primeiroDiaMes }
      });
      
      // Atualizar ou criar registro de participação
      await Participacao.findOneAndUpdate(
        { 
          jogador_apelido: jogador.apelido,
          mes_ano: mesAno
        },
        {
          participacoes: partidasMes,
          vitorias: vitoriasMes
        },
        { upsert: true }
      );
    }
    
    console.log(`✅ Participações do mês ${mesAno} atualizadas`);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar participações:', error);
  }
}

// ... (restante do código mantido igual)

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
// ROTA PARA PÓDIO MENSAL CORRIGIDA
// ============================================

app.get('/api/podios/mensal-corrigido', async (req, res) => {
  try {
    console.log('🏆 Calculando pódio mensal corrigido...');
    
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    
    // 1. Buscar TODAS as partidas do mês atual
    const partidasDoMes = await Partida.find({
      data: { $gte: inicioMes, $lte: fimMes }
    }).lean();
    
    if (partidasDoMes.length === 0) {
      return res.json({ 
        success: true, 
        podio: [],
        mensagem: 'Nenhuma partida este mês' 
      });
    }
    
    // 2. Calcular vitórias e participações de cada jogador
    const estatisticas = {};
    
    partidasDoMes.forEach(partida => {
      const { vencedor, participantes } = partida;
      
      // Inicializar jogador se não existir
      if (!estatisticas[vencedor]) {
        estatisticas[vencedor] = { vitorias: 0, partidas: 0, apelido: vencedor };
      }
      
      // Contar vitória
      estatisticas[vencedor].vitorias += 1;
      estatisticas[vencedor].partidas += 1;
      
      // Contar participação dos outros jogadores
      participantes.forEach(participante => {
        if (participante !== vencedor) {
          if (!estatisticas[participante]) {
            estatisticas[participante] = { vitorias: 0, partidas: 0, apelido: participante };
          }
          estatisticas[participante].partidas += 1;
        }
      });
    });
    
    // 3. Converter para array
    const rankingArray = Object.values(estatisticas);
    
    // 4. ORDENAR: Primeiro por vitórias (maior), depois por partidas (maior)
    rankingArray.sort((a, b) => {
      // Critério 1: Mais vitórias
      if (b.vitorias !== a.vitorias) {
        return b.vitorias - a.vitorias;
      }
      // Critério 2 (desempate): Mais partidas
      return b.partidas - a.partidas;
    });
    
    // 5. Pegar apenas os 3 primeiros
    const podio = rankingArray.slice(0, 3);
    
    // 6. Buscar patentes dos jogadores do pódio
    for (let i = 0; i < podio.length; i++) {
      const jogador = await Jogador.findOne({ 
        apelido: podio[i].apelido 
      }).select('patente').lean();
      
      podio[i].patente = jogador?.patente || 'Cabo 🪖';
    }
    
    console.log('✅ Pódio mensal calculado:', podio);
    res.json({ success: true, podio });
    
  } catch (error) {
    console.error('❌ Erro no pódio mensal:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
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
