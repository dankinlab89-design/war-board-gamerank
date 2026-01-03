// server/maintenance.js
const mongoose = require('mongoose');
require('dotenv').config();

const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function conectarMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    console.log('✅ MongoDB conectado para manutenção');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error);
    return false;
  }
}

// 1. REGISTRAR VENCEDOR MENSAL (rodar no dia 1 de cada mês)
async function registrarVencedorMensal() {
  try {
    const { VencedorMensal, Jogador, Partida } = mongoose.models;
    
    const hoje = new Date();
    
    // Só executar no dia 1
    if (hoje.getDate() !== 1) {
      console.log('ℹ️ Hoje não é dia 1, função não executada');
      return;
    }
    
    const mesPassado = hoje.getMonth(); // Janeiro = 0
    const ano = hoje.getFullYear();
    
    const mesReferencia = mesPassado === 0 ? 12 : mesPassado;
    const anoReferencia = mesPassado === 0 ? ano - 1 : ano;
    
    console.log(`📅 Registrando vencedor do mês: ${mesReferencia}/${anoReferencia}`);
    
    // Buscar ranking do mês anterior
    const primeiroDiaMes = new Date(anoReferencia, mesReferencia - 1, 1);
    const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0);
    
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
      const jogador = await Jogador.findOne({ apelido: vencedor._id });
      
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
    } else {
      console.log(`ℹ️ Nenhuma partida no mês ${mesReferencia}/${anoReferencia}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao registrar vencedor mensal:', error);
  }
}

// 2. ATUALIZAR ESTATÍSTICAS DIÁRIAS
async function atualizarEstatisticasDiarias() {
  try {
    const { Estatistica, Participacao, Jogador, Partida } = mongoose.models;
    
    console.log('📊 Atualizando estatísticas diárias...');
    
    // Calcular recorde consecutivo
    const jogadores = await Jogador.find({ ativo: true }).select('apelido');
    let maxConsecutivo = 0;
    let recordHolder = '';
    
    for (const jogador of jogadores) {
      const partidasJogador = await Partida.find({
        participantes: jogador.apelido
      }).sort({ data: 1 });
      
      let consecutivoAtual = 0;
      let maxConsecutivoJogador = 0;
      
      for (const partida of partidasJogador) {
        if (partida.vencedor === jogador.apelido) {
          consecutivoAtual++;
          maxConsecutivoJogador = Math.max(maxConsecutivoJogador, consecutivoAtual);
        } else {
          consecutivoAtual = 0;
        }
      }
      
      if (maxConsecutivoJogador > maxConsecutivo) {
        maxConsecutivo = maxConsecutivoJogador;
        recordHolder = jogador.apelido;
      }
    }
    
    // Salvar recorde
    await Estatistica.findOneAndUpdate(
      { tipo: 'record_consecutivo' },
      { 
        valor: { 
          max_consecutivo: maxConsecutivo,
          jogador_apelido: recordHolder 
        },
        jogador_associado: recordHolder,
        data_atualizacao: new Date()
      },
      { upsert: true }
    );
    
    // Atualizar participações do mês atual
    const hoje = new Date();
    const mesAno = `${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    for (const jogador of jogadores) {
      const partidasMes = await Partida.countDocuments({
        participantes: jogador.apelido,
        data: { $gte: primeiroDiaMes }
      });
      
      const vitoriasMes = await Partida.countDocuments({
        vencedor: jogador.apelido,
        data: { $gte: primeiroDiaMes }
      });
      
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
    
    console.log(`✅ Estatísticas atualizadas. Recorde: ${recordHolder} (${maxConsecutivo} consecutivas)`);
    
  } catch (error) {
    console.error('❌ Erro ao atualizar estatísticas:', error);
  }
}

// 3. INICIALIZAR DADOS PARA 2025
async function inicializarDados2025() {
  try {
    const { VencedorMensal } = mongoose.models;
    
    // Verificar se já existem dados para 2025
    const existe2025 = await VencedorMensal.findOne({ ano: 2025 });
    
    if (!existe2025) {
      console.log('📅 Inicializando dados especiais para 2025...');
      
      // Criar registro especial para 2025
      const ranking2025 = new VencedorMensal({
        ano: 2025,
        mes: 0, // 0 indica que é o ranking anual
        jogador_apelido: 'NEY2003',
        vitorias: 30,
        partidas: 0,
        patente: 'Marechal 🏆',
        data_registro: new Date(2025, 0, 1)
      });
      
      await ranking2025.save();
      
      // Adicionar outros colocados (opcional)
      const outros2025 = [
        { apelido: 'PetroIdeal', vitorias: 22, patente: 'General ⭐' },
        { apelido: 'Daniel$80', vitorias: 22, patente: 'General ⭐' },
        { apelido: 'TucaRei', vitorias: 21, patente: 'Coronel 🎖️' }
      ];
      
      for (const jogador of outros2025) {
        const registro = new VencedorMensal({
          ano: 2025,
          mes: 0,
          jogador_apelido: jogador.apelido,
          vitorias: jogador.vitorias,
          partidas: 0,
          patente: jogador.patente,
          data_registro: new Date(2025, 0, 1)
        });
        
        await registro.save();
      }
      
      console.log('✅ Dados de 2025 inicializados com sucesso');
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar dados 2025:', error);
  }
}

// FUNÇÃO PRINCIPAL
async function main() {
  const conectado = await conectarMongoDB();
  
  if (!conectado) {
    console.error('❌ Não foi possível conectar ao MongoDB');
    process.exit(1);
  }
  
  // Carregar modelos
  require('./index.js');
  
  // Executar funções
  await registrarVencedorMensal();
  await atualizarEstatisticasDiarias();
  await inicializarDados2025();
  
  console.log('✅ Todas as tarefas de manutenção concluídas');
  
  // Desconectar
  await mongoose.disconnect();
  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  registrarVencedorMensal,
  atualizarEstatisticasDiarias,
  inicializarDados2025
};
