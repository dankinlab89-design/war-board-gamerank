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
    
    // Inicializar sistema de vencedores mensais após conexão
    inicializarSistemaVencedoresMensais();
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

// Schema para Vencedores Mensais (sistema automático)
const vencedorMensalSchema = new mongoose.Schema({
  ano: { 
    type: Number, 
    required: true,
    min: 2026  // Sistema começa em 2026
  },
  mes: { 
    type: Number, 
    required: true,
    min: 1,
    max: 12
  },
  mes_nome: { 
    type: String, 
    required: true 
  },
  apelido_vencedor: { 
    type: String, 
    required: true 
  },
  nome_vencedor: String,
  patente_vencedor: String,
  vitorias_mes: { 
    type: Number, 
    required: true,
    min: 0
  },
  partidas_mes: { 
    type: Number, 
    required: true,
    min: 0
  },
  performance_mes: {
    type: Number,
    min: 0,
    max: 100
  },
  pontuacao_mes: Number,
  participantes_mes: [String], // Top 3 do mês
  data_registro: { 
    type: Date, 
    default: Date.now 
  },
  observacoes: String,
  status: {
    type: String,
    enum: ['registrado', 'pendente', 'sem_partidas'],
    default: 'registrado'
  }
});

// Criar índice único para ano+mês
vencedorMensalSchema.index({ ano: 1, mes: 1 }, { unique: true });

// Schema para Estatísticas Avançadas
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
const Jogador = mongoose.model('Jogador', jogadorSchema);
const Partida = mongoose.model('Partida', partidaSchema);
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
// FUNÇÃO DE CÁLCULO DE PATENTE (SÓ CÁLCULO)
// ============================================

function calcularPatente(vitorias) {
    const patentes = [
        { nome: 'Cabo 🪖', min: 0, max: 5 },
        { nome: 'Sargento 🛡️', min: 6, max: 10 },
        { nome: 'Tenente ⚔️', min: 11, max: 20 },
        { nome: 'Capitão 👮', min: 21, max: 30 },
        { nome: 'Major 💪', min: 31, max: 40 },
        { nome: 'Coronel 🎖️', min: 41, max: 60 },
        { nome: 'General ⭐', min: 61, max: 99 },
        { nome: 'Marechal 🏆', min: 100, max: Infinity }
    ];

    for (const patente of patentes) {
        if (vitorias >= patente.min && vitorias <= patente.max) {
            return patente.nome;
        }
    }
    
    return 'Cabo 🪖'; // Fallback seguro
}

// ============================================
// SISTEMA DE VENCEDORES MENSAIS AUTOMÁTICO
// ============================================

async function inicializarSistemaVencedoresMensais() {
  try {
    console.log('🔄 Inicializando sistema de vencedores mensais...');
    
    // Verificar se já existe algum registro de vencedor mensal
    const existeRegistro = await VencedorMensal.findOne();
    
    if (!existeRegistro) {
      console.log('📅 Criando registros iniciais de vencedores mensais...');
      
      // Criar registros pendentes para 2026 em diante
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      
      if (anoAtual >= 2026) {
        await criarRegistrosPendentesParaAno(anoAtual);
      }
      
      // Criar também para 2026 (ano base do sistema)
      if (anoAtual > 2026) {
        await criarRegistrosPendentesParaAno(2026);
      }
      
      console.log('✅ Sistema de vencedores mensais inicializado');
    } else {
      console.log('✅ Sistema de vencedores mensais já inicializado');
    }
    
    // Verificar se há meses pendentes para processar
    setTimeout(verificarMesesPendentes, 5000); // Aguarda 5 segundos após inicialização
    
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de vencedores mensais:', error);
  }
}

async function criarRegistrosPendentesParaAno(ano) {
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const registrosCriados = [];
  
  for (let mes = 1; mes <= 12; mes++) {
    try {
      const existe = await VencedorMensal.findOne({ ano, mes });
      
      if (!existe) {
        const registroPendente = new VencedorMensal({
          ano,
          mes,
          mes_nome: nomesMeses[mes - 1],
          apelido_vencedor: 'PENDENTE',
          nome_vencedor: 'Aguardando fechamento',
          patente_vencedor: '-',
          vitorias_mes: 0,
          partidas_mes: 0,
          performance_mes: 0,
          pontuacao_mes: 0,
          participantes_mes: [],
          observacoes: `Mês ${nomesMeses[mes-1]}/${ano} - Aguardando partidas`,
          status: 'pendente'
        });
        
        await registroPendente.save();
        registrosCriados.push({ ano, mes, status: 'criado' });
      }
    } catch (error) {
      console.error(`❌ Erro ao criar registro para ${mes}/${ano}:`, error.message);
    }
  }
  
  console.log(`📅 Criados ${registrosCriados.length} registros pendentes para ${ano}`);
  return registrosCriados;
}

async function verificarMesesPendentes() {
  try {
    console.log('🔍 Verificando meses pendentes para fechamento...');
    
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    // Buscar todos os meses pendentes até o mês anterior
    const mesesPendentes = [];
    
    for (let ano = 2026; ano <= anoAtual; ano++) {
      const ultimoMes = (ano === anoAtual) ? mesAtual - 1 : 12;
      
      for (let mes = 1; mes <= ultimoMes; mes++) {
        const registro = await VencedorMensal.findOne({ ano, mes });
        
        if (!registro || registro.status === 'pendente') {
          mesesPendentes.push({ ano, mes });
        }
      }
    }
    
    console.log(`📋 ${mesesPendentes.length} meses pendentes encontrados`);
    
    // Processar cada mês pendente
    for (const { ano, mes } of mesesPendentes) {
      await processarVencedorMensal(ano, mes);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo entre processamentos
    }
    
    if (mesesPendentes.length > 0) {
      console.log('✅ Todos os meses pendentes processados');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar meses pendentes:', error);
  }
}

async function processarVencedorMensal(ano, mes) {
  try {
    console.log(`📊 Processando vencedor do mês: ${mes}/${ano}`);
    
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Calcular datas do mês
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
    
    // Buscar partidas do mês
    const partidasMes = await Partida.find({
      data: { $gte: inicioMes, $lte: fimMes }
    });
    
    console.log(`🎮 ${partidasMes.length} partidas encontradas no mês`);
    
    // Se não houver partidas, marcar como "sem partidas"
    if (partidasMes.length === 0) {
      await VencedorMensal.findOneAndUpdate(
        { ano, mes },
        {
          apelido_vencedor: 'SEM PARTIDAS',
          nome_vencedor: 'Nenhuma partida registrada',
          patente_vencedor: '-',
          vitorias_mes: 0,
          partidas_mes: 0,
          performance_mes: 0,
          pontuacao_mes: 0,
          participantes_mes: [],
          observacoes: `Nenhuma partida registrada em ${nomesMeses[mes-1]}/${ano}`,
          status: 'sem_partidas'
        },
        { upsert: true, new: true }
      );
      
      console.log(`ℹ️  ${mes}/${ano}: Nenhuma partida registrada`);
      return { success: true, semPartidas: true };
    }
    
    // Calcular estatísticas do mês
    const stats = {};
    
    partidasMes.forEach(partida => {
      // Contar vitória do vencedor
      if (!stats[partida.vencedor]) {
        stats[partida.vencedor] = { 
          vitorias: 0, 
          partidas: 0,
          participacoesUnicas: new Set() 
        };
      }
      stats[partida.vencedor].vitorias++;
      
      // Contar participações de todos
      partida.participantes.forEach(participante => {
        if (!stats[participante]) {
          stats[participante] = { 
            vitorias: 0, 
            partidas: 0,
            participacoesUnicas: new Set() 
          };
        }
        stats[participante].partidas++;
        stats[participante].participacoesUnicas.add(partida._id.toString());
      });
    });
    
    // Converter para array e calcular performance
    const ranking = Object.entries(stats)
      .map(([apelido, { vitorias, partidas, participacoesUnicas }]) => ({
        apelido,
        vitorias,
        partidas,
        participacoesUnicas: participacoesUnicas.size,
        performance: partidas > 0 ? Math.round((vitorias / partidas) * 1000) / 10 : 0,
        pontuacao: (vitorias * 10) + (partidas * 2)
      }))
      .sort((a, b) => {
        // 1º Critério: Mais vitórias
        if (b.vitorias !== a.vitorias) return b.vitorias - a.vitorias;
        // 2º Critério: Mais partidas
        if (b.partidas !== a.partidas) return b.partidas - a.partidas;
        // 3º Critério: Mais participações únicas
        return b.participacoesUnicas - a.participacoesUnicas;
      });
    
    if (ranking.length === 0) {
      console.error(`❌ Erro ao calcular ranking do mês ${mes}/${ano}`);
      return { success: false, error: 'Erro no cálculo do ranking' };
    }
    
    // Pegar vencedor (1º lugar)
    const vencedor = ranking[0];
    
    // Buscar informações do vencedor
    const jogadorVencedor = await Jogador.findOne({ apelido: vencedor.apelido });
    
    // Top 3 do mês
    const top3 = ranking.slice(0, 3).map(j => j.apelido);
    
    // Criar ou atualizar registro
    const registroAtualizado = await VencedorMensal.findOneAndUpdate(
      { ano, mes },
      {
        mes_nome: nomesMeses[mes - 1],
        apelido_vencedor: vencedor.apelido,
        nome_vencedor: jogadorVencedor ? jogadorVencedor.nome : vencedor.apelido,
        patente_vencedor: jogadorVencedor ? jogadorVencedor.patente : 'Cabo 🪖',
        vitorias_mes: vencedor.vitorias,
        partidas_mes: vencedor.partidas,
        performance_mes: vencedor.performance,
        pontuacao_mes: vencedor.pontuacao,
        participantes_mes: top3,
        observacoes: `Vencedor: ${vencedor.apelido} com ${vencedor.vitorias} vitórias em ${vencedor.partidas} partidas (${vencedor.performance}%)`,
        status: 'registrado',
        data_registro: new Date()
      },
      { upsert: true, new: true }
    );
    
    console.log(`🏆 ${mes}/${ano}: ${vencedor.apelido} venceu com ${vencedor.vitorias} vitórias`);
    
    return {
      success: true,
      message: `Vencedor do mês ${mes}/${ano} registrado com sucesso`,
      data: registroAtualizado,
      ranking: ranking.slice(0, 5)
    };
    
  } catch (error) {
    console.error(`❌ Erro ao processar vencedor mensal ${mes}/${ano}:`, error);
    
    // Em caso de erro de duplicata, apenas logar
    if (error.code === 11000) {
      console.log(`⚠️  ${mes}/${ano} já registrado anteriormente`);
      return { success: true, message: 'Já registrado' };
    }
    
    return { success: false, error: error.message };
  }
}

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

// POST nova partida - VERSÃO ÚNICA E COMPLETA (com sistema de patentes)
app.post('/api/partidas', async (req, res) => {
  try {
    const { data, tipo, vencedor, participantes, observacoes, pontos } = req.body;

    // ============================================
    // VALIDAÇÕES
    // ============================================
    if (!data || !vencedor || !participantes || !Array.isArray(participantes)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados incompletos ou inválidos' 
      });
    }

    if (participantes.length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mínimo de 3 participantes necessário' 
      });
    }

    if (!participantes.includes(vencedor)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Vencedor deve estar entre os participantes' 
      });
    }

    // ============================================
    // 1. BUSCAR JOGADOR VENCEDOR
    // ============================================
    const jogadorVencedor = await Jogador.findOne({ apelido: vencedor });
    if (!jogadorVencedor) {
      return res.status(404).json({ 
        success: false, 
        error: `Jogador vencedor "${vencedor}" não encontrado` 
      });
    }

    // ============================================
    // 2. CRIAR PARTIDA NO BANCO
    // ============================================
    const novaPartida = new Partida({
      data: new Date(data),
      tipo: tipo || 'global',
      vencedor: vencedor,
      participantes: participantes,
      observacoes: observacoes || '',
      pontos: pontos || 100
    });

    const partidaSalva = await novaPartida.save();
    console.log(`✅ Partida registrada: ${vencedor} venceu em ${data}`);

    // ============================================
    // 3. ATUALIZAR ESTATÍSTICAS DO VENCEDOR + PATENTE
    // ============================================
    const vitoriasAtualizadas = (jogadorVencedor.vitorias || 0) + 1;
    const partidasAtualizadas = (jogadorVencedor.partidas || 0) + 1;
    
    // Calcular nova patente
    const novaPatente = calcularPatente(vitoriasAtualizadas);
    const patenteMudou = jogadorVencedor.patente !== novaPatente;
    
    // Dados para atualização
    const updateDataVencedor = {
      vitorias: vitoriasAtualizadas,
      partidas: partidasAtualizadas,
      atualizado_em: new Date()
    };
    
    // Se patente mudou, adicionar ao update
    if (patenteMudou) {
      updateDataVencedor.patente = novaPatente;
      updateDataVencedor.data_promocao = new Date();
    }
    
    // Atualizar vencedor
    await Jogador.findOneAndUpdate(
      { apelido: vencedor },
      updateDataVencedor
    );

    // ============================================
    // 4. ATUALIZAR PARTIDAS DOS OUTROS PARTICIPANTES
    // ============================================
    if (participantes && Array.isArray(participantes)) {
      const outrosParticipantes = participantes.filter(p => p !== vencedor);
      
      if (outrosParticipantes.length > 0) {
        await Jogador.updateMany(
          { apelido: { $in: outrosParticipantes } },
          { 
            $inc: { partidas: 1 },
            $set: { atualizado_em: new Date() }
          }
        );
      }
    }

    // ============================================
    // 5. PREPARAR RESPOSTA
    // ============================================
    const resposta = {
      success: true, 
      message: 'Partida registrada com sucesso!',
      partida: partidaSalva
    };
    
    // Adicionar informação de promoção se ocorreu
    if (patenteMudou) {
      resposta.promocao = {
        promovido: true,
        apelido: jogadorVencedor.apelido,
        antiga: jogadorVencedor.patente,
        nova: novaPatente,
        vitorias: vitoriasAtualizadas
      };
      resposta.message += ` 🎖️ ${vencedor} foi promovido para ${novaPatente}!`;
    }
    
    res.status(201).json(resposta);
    
  } catch (error) {
    console.error('❌ Erro ao registrar partida:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
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

// PUT atualizar partida - VERSÃO ATUALIZADA COM PATENTES
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
    
    // ============================================
    // IMPORTANTE: Se mudou o vencedor, ajustar estatísticas E PATENTES
    // ============================================
    if (req.body.vencedor && req.body.vencedor !== partidaExistente.vencedor) {
      console.log(`🔄 Mudança de vencedor: ${partidaExistente.vencedor} → ${req.body.vencedor}`);
      
      // 1. REMOVER VITÓRIA DO VENCEDOR ANTIGO E RECALCULAR PATENTE
      const vencedorAntigo = await Jogador.findOne({ apelido: partidaExistente.vencedor });
      if (vencedorAntigo) {
        const novasVitoriasAntigo = Math.max(0, (vencedorAntigo.vitorias || 0) - 1);
        const novaPatenteAntigo = calcularPatente(novasVitoriasAntigo);
        
        console.log(`↘️ Removendo vitória de ${vencedorAntigo.apelido}: ${vencedorAntigo.vitorias} → ${novasVitoriasAntigo} vitórias`);
        
        await Jogador.findOneAndUpdate(
          { apelido: partidaExistente.vencedor },
          { 
            $inc: { vitorias: -1 },
            $set: { 
              patente: novaPatenteAntigo,
              atualizado_em: new Date()
            }
          }
        );
      }
      
      // 2. ADICIONAR VITÓRIA AO NOVO VENCEDOR E RECALCULAR PATENTE
      const novoVencedor = await Jogador.findOne({ apelido: req.body.vencedor });
      if (novoVencedor) {
        const novasVitoriasNovo = (novoVencedor.vitorias || 0) + 1;
        const novaPatenteNovo = calcularPatente(novasVitoriasNovo);
        const patenteMudou = novoVencedor.patente !== novaPatenteNovo;
        
        console.log(`↗️ Adicionando vitória a ${novoVencedor.apelido}: ${novoVencedor.vitorias} → ${novasVitoriasNovo} vitórias`);
        
        const updateDataNovo = {
          $inc: { vitorias: 1 },
          $set: { atualizado_em: new Date() }
        };
        
        if (patenteMudou) {
          updateDataNovo.$set.patente = novaPatenteNovo;
          updateDataNovo.$set.data_promocao = new Date();
          console.log(`🎖️ ${novoVencedor.apelido} promovido: ${novoVencedor.patente} → ${novaPatenteNovo}`);
        }
        
        await Jogador.findOneAndUpdate(
          { apelido: req.body.vencedor },
          updateDataNovo
        );
      }
      
      // 3. ATUALIZAR PARTICIPANTES (se a lista mudou)
      if (req.body.participantes && Array.isArray(req.body.participantes)) {
        const participantesAntigos = partidaExistente.participantes || [];
        const participantesNovos = req.body.participantes;
        
        // Jogadores que saíram da partida
        const sairam = participantesAntigos.filter(p => !participantesNovos.includes(p));
        for (const participante of sairam) {
          const jogador = await Jogador.findOne({ apelido: participante });
          if (jogador) {
            const novasPartidas = Math.max(0, (jogador.partidas || 0) - 1);
            await Jogador.findOneAndUpdate(
              { apelido: participante },
              { 
                $set: { 
                  partidas: novasPartidas,
                  atualizado_em: new Date()
                }
              }
            );
          }
        }
        
        // Jogadores que entraram na partida (exceto o novo vencedor)
        const entraram = participantesNovos.filter(p => 
          !participantesAntigos.includes(p) && p !== req.body.vencedor
        );
        if (entraram.length > 0) {
          await Jogador.updateMany(
            { apelido: { $in: entraram } },
            { 
              $inc: { partidas: 1 },
              $set: { atualizado_em: new Date() }
            }
          );
        }
      }
    }
    
    // ============================================
    // ATUALIZAR PARTIDA
    // ============================================
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

// DELETE excluir partida - VERSÃO ATUALIZADA COM PATENTES
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
    
    // ============================================
    // REVERTER ESTATÍSTICAS DOS JOGADORES E PATENTES
    // ============================================
    
    // 1. REMOVER VITÓRIA DO VENCEDOR E RECALCULAR PATENTE
    const vencedor = await Jogador.findOne({ apelido: partida.vencedor });
    if (vencedor) {
      const novasVitorias = Math.max(0, (vencedor.vitorias || 0) - 1);
      const novasPartidas = Math.max(0, (vencedor.partidas || 0) - 1);
      const novaPatente = calcularPatente(novasVitorias);
      const patenteMudou = vencedor.patente !== novaPatente;
      
      console.log(`↘️ Revertendo vitória de ${vencedor.apelido}: ${vencedor.vitorias} → ${novasVitorias} vitórias`);
      
      const updateDataVencedor = {
        $set: { 
          vitorias: novasVitorias,
          partidas: novasPartidas,
          atualizado_em: new Date()
        }
      };
      
      if (patenteMudou) {
        updateDataVencedor.$set.patente = novaPatente;
        updateDataVencedor.$set.data_rebaixamento = new Date();
        console.log(`📉 ${vencedor.apelido} rebaixado: ${vencedor.patente} → ${novaPatente}`);
      }
      
      await Jogador.findOneAndUpdate(
        { apelido: partida.vencedor },
        updateDataVencedor
      );
    }
    
    // 2. REMOVER PARTIDAS DOS OUTROS PARTICIPANTES
    if (partida.participantes && Array.isArray(partida.participantes)) {
      const outrosParticipantes = partida.participantes.filter(p => p !== partida.vencedor);
      
      if (outrosParticipantes.length > 0) {
        console.log(`↘️ Revertendo partida de ${outrosParticipantes.length} outros participantes`);
        
        for (const participante of outrosParticipantes) {
          const jogador = await Jogador.findOne({ apelido: participante });
          if (jogador) {
            const novasPartidas = Math.max(0, (jogador.partidas || 0) - 1);
            await Jogador.findOneAndUpdate(
              { apelido: participante },
              { 
                $set: { 
                  partidas: novasPartidas,
                  atualizado_em: new Date()
                }
              }
            );
          }
        }
      }
    }
    
    // ============================================
    // EXCLUIR PARTIDA
    // ============================================
    await Partida.findByIdAndDelete(req.params.id);
    
    console.log('✅ Partida excluída:', partida._id);
    
    res.json({ 
      success: true, 
      message: 'Partida excluída com sucesso!',
      partida_excluida: partida
    });
    
  } catch (error) {
    console.error('❌ Erro ao excluir partida:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

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

// ============================================
// ROTAS DA API - ESTATÍSTICAS
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
    
    const [totalJogadores, totalPartidas, vencedoresMensais] = await Promise.all([
      Jogador.countDocuments({ ativo: true }),
      Partida.countDocuments(),
      VencedorMensal.find({ status: 'registrado' })
        .sort({ ano: -1, mes: -1 })
        .limit(5)
        .lean()
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
    
    // Vencedor do mês atual (se já registrado)
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    const vencedorMesAtual = await VencedorMensal.findOne({
      ano: anoAtual,
      mes: mesAtual,
      status: 'registrado'
    }).lean();
    
    const response = {
      success: true,
      total_jogadores: totalJogadores,
      total_partidas: totalPartidas,
      media_partidas: mediaPartidas,
      podium: top3,
      ultimas_partidas: ultimasPartidas,
      vencedores_mensais: vencedoresMensais,
      vencedor_mes_atual: vencedorMesAtual || null,
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
// ROTAS DA API - VENCEDORES MENSAIS
// ============================================

// GET vencedores por ano
app.get('/api/vencedores/mensal/:ano', async (req, res) => {
  try {
    const ano = parseInt(req.params.ano);
    
    if (ano < 2026) {
      // Para anos anteriores a 2026, usar ranking fixo
      return res.json({
        success: true,
        ano: ano,
        tipo: 'ranking_anual',
        vencedores: [
          { posicao: 1, apelido: 'NEY2002', vitorias: 30, partidas: 0 },
          { posicao: 2, apelido: 'PetroIdeal', vitorias: 22, partidas: 0 },
          { posicao: 2, apelido: 'Daniel$80', vitorias: 22, partidas: 0 },
          { posicao: 3, apelido: 'TucaRei', vitorias: 21, partidas: 0 }
        ],
        mensagem: 'Ranking anual fixo (sistema automático a partir de 2026)'
      });
    }
    
    // Para 2026+, buscar do banco
    const vencedores = await VencedorMensal.find({ ano })
      .sort({ mes: 1 })
      .select('ano mes mes_nome apelido_vencedor nome_vencedor patente_vencedor vitorias_mes partidas_mes performance_mes pontuacao_mes status');
    
    // Preencher meses faltantes
    const todosMeses = [];
    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    for (let mes = 1; mes <= 12; mes++) {
      const vencedorMes = vencedores.find(v => v.mes === mes);
      
      if (vencedorMes) {
        todosMeses.push(vencedorMes);
      } else {
        todosMeses.push({
          ano,
          mes,
          mes_nome: nomesMeses[mes - 1],
          apelido_vencedor: 'PENDENTE',
          nome_vencedor: 'Aguardando fechamento',
          patente_vencedor: '-',
          vitorias_mes: 0,
          partidas_mes: 0,
          performance_mes: 0,
          pontuacao_mes: 0,
          status: 'pendente',
          observacoes: 'Aguardando fechamento do mês'
        });
      }
    }
    
    res.json({
      success: true,
      ano,
      tipo: 'mensal',
      total_meses_registrados: vencedores.length,
      todos_meses: todosMeses
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar vencedores mensais:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST registrar vencedor do mês (manual para admin)
app.post('/api/vencedores/registrar-mensal', async (req, res) => {
  try {
    const { ano, mes } = req.body;
    
    if (!ano || !mes) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ano e mês são obrigatórios' 
      });
    }
    
    console.log(`📅 Registro manual solicitado: ${mes}/${ano}`);
    
    const resultado = await processarVencedorMensal(ano, mes);
    
    if (resultado.success) {
      res.json({
        success: true,
        message: resultado.message,
        data: resultado.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: resultado.error
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao registrar vencedor mensal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET verificar meses pendentes
app.get('/api/vencedores/verificar-pendentes', async (req, res) => {
  try {
    console.log('🔍 Verificando meses pendentes via API...');
    
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    const mesesPendentes = [];
    
    // Verificar de 2026 até ano atual
    for (let ano = 2026; ano <= anoAtual; ano++) {
      const ultimoMes = (ano === anoAtual) ? mesAtual - 1 : 12;
      
      for (let mes = 1; mes <= ultimoMes; mes++) {
        const registro = await VencedorMensal.findOne({ ano, mes });
        
        if (!registro || registro.status === 'pendente') {
          mesesPendentes.push({ ano, mes });
        }
      }
    }
    
    res.json({
      success: true,
      total_pendentes: mesesPendentes.length,
      meses_pendentes: mesesPendentes,
      mensagem: `${mesesPendentes.length} meses pendentes encontrados`
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar meses pendentes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST processar todos meses pendentes
app.post('/api/vencedores/processar-pendentes', async (req, res) => {
  try {
    console.log('🔄 Processando todos os meses pendentes...');
    
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    const resultados = [];
    const mesesPendentes = [];
    
    // Identificar meses pendentes
    for (let ano = 2026; ano <= anoAtual; ano++) {
      const ultimoMes = (ano === anoAtual) ? mesAtual - 1 : 12;
      
      for (let mes = 1; mes <= ultimoMes; mes++) {
        const registro = await VencedorMensal.findOne({ ano, mes });
        
        if (!registro || registro.status === 'pendente') {
          mesesPendentes.push({ ano, mes });
        }
      }
    }
    
    console.log(`📋 ${mesesPendentes.length} meses pendentes encontrados`);
    
    // Processar cada mês pendente
    for (const { ano, mes } of mesesPendentes) {
      console.log(`   Processando ${mes}/${ano}...`);
      
      const resultado = await processarVencedorMensal(ano, mes);
      
      resultados.push({
        ano,
        mes,
        success: resultado.success,
        message: resultado.message || resultado.error,
        vencedor: resultado.data?.apelido_vencedor || 'Nenhum',
        semPartidas: resultado.semPartidas || false
      });
      
      // Aguardar 1 segundo entre processamentos
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    res.json({
      success: true,
      message: `Processamento concluído: ${resultados.length} meses processados`,
      total_meses: resultados.length,
      meses_processados: resultados.length,
      resultados
    });
    
  } catch (error) {
    console.error('❌ Erro no processamento de meses pendentes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ROTAS ADMIN - VENCEDORES MENSAIS
// ============================================

// GET status do sistema de vencedores
app.get('/api/admin/vencedores/status', async (req, res) => {
  try {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    // Contar registros
    const totalRegistros = await VencedorMensal.countDocuments();
    const registrosAtivos = await VencedorMensal.countDocuments({ status: 'registrado' });
    const registrosPendentes = await VencedorMensal.countDocuments({ status: 'pendente' });
    
    // Último registro
    const ultimoRegistro = await VencedorMensal.findOne()
      .sort({ data_registro: -1 });
    
    // Verificar meses pendentes do ano atual (2026+)
    let mesesPendentesAnoAtual = 0;
    if (anoAtual >= 2026) {
      for (let mes = 1; mes < mesAtual; mes++) {
        const registro = await VencedorMensal.findOne({ ano: anoAtual, mes });
        if (!registro || registro.status === 'pendente') {
          mesesPendentesAnoAtual++;
        }
      }
    }
    
    res.json({
      success: true,
      data_consulta: hoje.toISOString(),
      sistema: {
        ano_minimo: 2026,
        ano_atual: anoAtual,
        mes_atual: mesAtual,
        status: anoAtual >= 2026 ? 'ativo' : 'aguardando_2026'
      },
      registros: {
        total: totalRegistros,
        ativos: registrosAtivos,
        pendentes: registrosPendentes,
        sem_partidas: totalRegistros - registrosAtivos - registrosPendentes
      },
      ultimo_registro: ultimoRegistro ? {
        ano: ultimoRegistro.ano,
        mes: ultimoRegistro.mes,
        mes_nome: ultimoRegistro.mes_nome,
        vencedor: ultimoRegistro.apelido_vencedor,
        data: ultimoRegistro.data_registro
      } : null,
      pendentes: {
        meses_pendentes_ano_atual: mesesPendentesAnoAtual,
        status: mesesPendentesAnoAtual === 0 ? 'ATUALIZADO' : 'PENDENTE'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao obter status do sistema:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET todos os anos disponíveis
app.get('/api/admin/vencedores/anos', async (req, res) => {
  try {
    const anos = await VencedorMensal.aggregate([
      { 
        $group: { 
          _id: "$ano",
          total_meses: { $sum: 1 },
          registrados: { 
            $sum: { 
              $cond: [{ $eq: ["$status", "registrado"] }, 1, 0] 
            }
          },
          ultimo_registro: { $max: "$data_registro" }
        } 
      },
      { 
        $sort: { _id: -1 } // Ordenar do mais recente
      }
    ]);
    
    // Adicionar ano atual se não existir ainda (apenas 2026+)
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    
    if (anoAtual >= 2026 && !anos.find(a => a._id === anoAtual)) {
      anos.unshift({
        _id: anoAtual,
        total_meses: 0,
        registrados: 0,
        ultimo_registro: null,
        status: 'ano_atual'
      });
    }
    
    res.json({
      success: true,
      anos: anos.map(a => ({
        ano: a._id,
        total_meses: a.total_meses,
        meses_registrados: a.registrados,
        meses_pendentes: a.total_meses - a.registrados,
        ultimo_registro: a.ultimo_registro,
        status: a.status || 'ativo'
      }))
    });
  } catch (error) {
    console.error('❌ Erro ao buscar anos disponíveis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FUNÇÃO PARA CALCULAR RECORDE CONSECUTIVO
// ============================================

async function calcularRecordeConsecutivo() {
  try {
    console.log('🔍 Calculando recorde de vitórias consecutivas...');
    
    // Buscar TODOS os jogadores ativos
    const jogadores = await Jogador.find({ ativo: true }).select('apelido vitorias partidas');
    
    let candidatosRecorde = []; // Array para armazenar todos os candidatos
    
    for (const jogador of jogadores) {
      // Buscar partidas do jogador ordenadas por data
      const partidasJogador = await Partida.find({
        participantes: jogador.apelido
      }).sort({ data: 1 });
      
      // Calcular maior sequência de vitórias
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
      
      // Adicionar jogador à lista de candidatos se tiver sequência
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
    
    // ENCONTRAR O VENCEDOR COM CRITÉRIO DE DESEMPATE
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
    
    // Salvar no banco de estatísticas
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

// ROTA PARA ATUALIZAR RECORDE
app.get('/api/atualizar-recorde', async (req, res) => {
  try {
    console.log('🔄 Atualizando recorde consecutivo...');
    
    const resultado = await calcularRecordeConsecutivo();
    
    // Buscar estatística atualizada
    const estatistica = await Estatistica.findOne({ tipo: 'record_consecutivo' });
    
    res.json({
      success: true,
      mensagem: 'Recorde atualizado com sucesso',
      recorde: resultado.maxConsecutivo,
      detentor: resultado.recordHolder,
      estatistica_salva: estatistica?.valor,
      data: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar recorde:', error);
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
    const vencedoresCount = await VencedorMensal.countDocuments();
    
    res.json({
      success: true,
      jogadores: jogadoresCount,
      partidas: partidasCount,
      vencedores_mensais: vencedoresCount,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      sistema_vencedores: 'ativo (2026+)'
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
// AGENDADOR PARA PROCESSAR VENCEDORES MENSAIS
// ============================================

// Função para verificar e processar vencedores mensais automaticamente
// Será executada uma vez por dia
setInterval(() => {
  const agora = new Date();
  const hora = agora.getHours();
  
  // Executar apenas uma vez por dia, às 2h da manhã
  if (hora === 2 && mongoose.connection.readyState === 1) {
    console.log('⏰ Agendador: Verificando meses pendentes...');
    verificarMesesPendentes();
  }
}, 3600000); // Verificar a cada hora

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando: http://localhost:${PORT}`);
  console.log(`📁 Frontend servido de: ${path.join(__dirname, '../public')}`);
  console.log(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Aguardando...'}`);
  console.log(`🌍 CORS permitindo: ${allowedOrigins.join(', ')}`);
  console.log(`\n📊 Sistema de Vencedores Mensais:`);
  console.log(`   ✅ Automático a partir de 2026`);
  console.log(`   ✅ Processamento diário agendado`);
  console.log(`   ✅ Dashboard com histórico`);
  console.log(`\n🔧 Rotas principais:`);
  console.log(`   • /api/dashboard - Dashboard com vencedores`);
  console.log(`   • /api/vencedores/mensal/:ano - Vencedores por ano`);
  console.log(`   • /api/admin/vencedores/* - Painel administrativo`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/jogadores`);
  console.log(`   POST /api/jogadores`);
  console.log(`   GET  /api/partidas`);
  console.log(`   POST /api/partidas`);
});
