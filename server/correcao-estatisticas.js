// server/correcao-estatisticas.js
// Script para corrigir e recalcular todas as estatísticas do sistema

const mongoose = require('mongoose');

// ============================================
// FUNÇÃO PARA CALCULAR PATENTE
// ============================================
function calcularPatente(vitorias) {
    if (vitorias >= 100) return 'Marechal 🏆';
    if (vitorias >= 60) return 'General ⭐';
    if (vitorias >= 41) return 'Coronel 🎖️';
    if (vitorias >= 31) return 'Major 💪';
    if (vitorias >= 21) return 'Capitão 👮';
    if (vitorias >= 11) return 'Tenente ⚔️';
    if (vitorias >= 6) return 'Sargento 🛡️';
    return 'Cabo 🪖';
}

// ============================================
// FUNÇÃO PRINCIPAL - CORRIGIR TODAS ESTATÍSTICAS
// ============================================
async function corrigirTodasEstatisticas() {
    let connection;
    
    try {
        console.log('🔄 ===========================================');
        console.log('🔄 INICIANDO CORREÇÃO GERAL DE ESTATÍSTICAS');
        console.log('🔄 ===========================================\n');
        
        // Conectar ao MongoDB (usar mesma conexão do index.js)
        connection = mongoose.connection;
        
        if (connection.readyState !== 1) {
            console.log('📡 Conectando ao MongoDB...');
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        }
        
        console.log('✅ Conectado ao MongoDB\n');
        
        // ============ FASE 1: BUSCAR DADOS ============
        console.log('📊 FASE 1: Buscando dados do banco...');
        
        // Buscar modelos
        const Jogador = mongoose.models.Jogador || mongoose.model('Jogador', new mongoose.Schema({
            nome: String,
            apelido: String,
            email: String,
            observacoes: String,
            patente: String,
            ativo: Boolean,
            vitorias: Number,
            partidas: Number,
            data_cadastro: Date
        }));
        
        const Partida = mongoose.models.Partida || mongoose.model('Partida', new mongoose.Schema({
            data: Date,
            tipo: String,
            vencedor: String,
            participantes: [String],
            observacoes: String,
            pontos: Number
        }));
        
        // Buscar TODAS as partidas
        const todasPartidas = await Partida.find({}).sort({ data: 1 });
        console.log(`   📍 Partidas encontradas: ${todasPartidas.length}`);
        
        // Buscar TODOS os jogadores ativos
        const todosJogadores = await Jogador.find({ ativo: true });
        console.log(`   👥 Jogadores ativos: ${todosJogadores.length}\n`);
        
        if (todasPartidas.length === 0) {
            console.log('ℹ️  Nenhuma partida encontrada. Nada para corrigir.');
            return { success: true, message: 'Nenhuma partida para processar' };
        }
        
        // ============ FASE 2: RECALCULAR ESTATÍSTICAS ============
        console.log('📈 FASE 2: Recalculando estatísticas...');
        
        const estatisticasRecalculadas = new Map();
        const inconsistencias = [];
        
        // Inicializar mapa com todos os jogadores
        todosJogadores.forEach(jogador => {
            estatisticasRecalculadas.set(jogador.apelido, {
                vitórias: 0,
                partidas: 0,
                jogadorId: jogador._id,
                apelido: jogador.apelido,
                nome: jogador.nome
            });
        });
        
        // Processar cada partida
        console.log(`   📝 Processando ${todasPartidas.length} partidas...`);
        
        todasPartidas.forEach((partida, index) => {
            if (index % 10 === 0) {
                console.log(`      Partida ${index + 1}/${todasPartidas.length}`);
            }
            
            // 1. Contar vitória do vencedor
            if (estatisticasRecalculadas.has(partida.vencedor)) {
                const stats = estatisticasRecalculadas.get(partida.vencedor);
                stats.vitórias++;
            } else {
                // Jogador vencedor não está na lista de jogadores ativos
                estatisticasRecalculadas.set(partida.vencedor, {
                    vitórias: 1,
                    partidas: 0,
                    jogadorId: null,
                    apelido: partida.vencedor,
                    nome: partida.vencedor
                });
                inconsistencias.push(`Vencedor "${partida.vencedor}" não está na lista de jogadores`);
            }
            
            // 2. Contar participações de todos
            partida.participantes.forEach(participante => {
                if (estatisticasRecalculadas.has(participante)) {
                    const stats = estatisticasRecalculadas.get(participante);
                    stats.partidas++;
                } else {
                    // Participante não está na lista de jogadores
                    estatisticasRecalculadas.set(participante, {
                        vitórias: 0,
                        partidas: 1,
                        jogadorId: null,
                        apelido: participante,
                        nome: participante
                    });
                    inconsistencias.push(`Participante "${participante}" não está na lista de jogadores`);
                }
            });
        });
        
        console.log(`   ✅ Estatísticas recalculadas: ${estatisticasRecalculadas.size} jogadores\n`);
        
        // ============ FASE 3: ATUALIZAR BANCO DE DADOS ============
        console.log('💾 FASE 3: Atualizando banco de dados...');
        
        let atualizados = 0;
        let criados = 0;
        let erros = 0;
        let semAlteracoes = 0;
        
        const relatorio = [];
        
        for (const [apelido, stats] of estatisticasRecalculadas.entries()) {
            try {
                // Verificar se jogador já existe
                let jogador = await Jogador.findOne({ apelido: apelido });
                
                if (jogador) {
                    // Jogador existe - verificar se precisa atualizar
                    const precisaAtualizar = 
                        jogador.vitorias !== stats.vitórias || 
                        jogador.partidas !== stats.partidas;
                    
                    if (precisaAtualizar) {
                        // Salvar valores antigos
                        const valoresAntigos = {
                            vitorias: jogador.vitorias,
                            partidas: jogador.partidas,
                            patente: jogador.patente
                        };
                        
                        // Atualizar valores
                        jogador.vitorias = stats.vitórias;
                        jogador.partidas = stats.partidas;
                        jogador.patente = calcularPatente(stats.vitórias);
                        
                        await jogador.save();
                        atualizados++;
                        
                        relatorio.push({
                            tipo: 'atualizado',
                            apelido,
                            antes: valoresAntigos,
                            depois: {
                                vitorias: stats.vitórias,
                                partidas: stats.partidas,
                                patente: jogador.patente
                            }
                        });
                        
                        console.log(`   🔄 ${apelido}: ${valoresAntigos.vitorias}→${stats.vitórias}🏆 ${valoresAntigos.partidas}→${stats.partidas}🎮`);
                    } else {
                        semAlteracoes++;
                        console.log(`   ✓ ${apelido}: OK (sem alterações)`);
                    }
                } else {
                    // Jogador não existe - criar novo
                    jogador = new Jogador({
                        nome: stats.nome || apelido,
                        apelido: apelido,
                        vitorias: stats.vitórias,
                        partidas: stats.partidas,
                        patente: calcularPatente(stats.vitórias),
                        ativo: true,
                        observacoes: `Criado automaticamente pela correção de estatísticas em ${new Date().toLocaleDateString('pt-BR')}`,
                        data_cadastro: new Date()
                    });
                    
                    await jogador.save();
                    criados++;
                    
                    relatorio.push({
                        tipo: 'criado',
                        apelido,
                        dados: {
                            vitorias: stats.vitórias,
                            partidas: stats.partidas,
                            patente: jogador.patente
                        }
                    });
                    
                    console.log(`   ➕ ${apelido}: Criado (${stats.vitórias}🏆 ${stats.partidas}🎮)`);
                }
            } catch (error) {
                erros++;
                console.error(`   ❌ ${apelido}: ${error.message}`);
                relatorio.push({
                    tipo: 'erro',
                    apelido,
                    error: error.message
                });
            }
        }
        
        // ============ FASE 4: VERIFICAÇÃO DE CONSISTÊNCIA ============
        console.log('\n🔍 FASE 4: Verificando consistência...');
        
        // Verificar vencedores sem jogador
        const vencedoresSemJogador = [];
        const participantesSemJogador = [];
        
        todasPartidas.forEach(partida => {
            if (!estatisticasRecalculadas.has(partida.vencedor)) {
                vencedoresSemJogador.push(partida.vencedor);
            }
            
            partida.participantes.forEach(participante => {
                if (!estatisticasRecalculadas.has(participante)) {
                    participantesSemJogador.push(participante);
                }
            });
        });
        
        const vencedoresUnicos = [...new Set(vencedoresSemJogador)];
        const participantesUnicos = [...new Set(participantesSemJogador)];
        
        console.log(`   📊 Jogadores processados: ${estatisticasRecalculadas.size}`);
        console.log(`   ⚠️  Vencedores sem jogador: ${vencedoresUnicos.length}`);
        console.log(`   ⚠️  Participantes sem jogador: ${participantesUnicos.length}`);
        
        // ============ FASE 5: RELATÓRIO FINAL ============
        console.log('\n📋 ===========================================');
        console.log('📋 RELATÓRIO FINAL DA CORREÇÃO');
        console.log('📋 ===========================================');
        console.log(`✅ Jogadores atualizados: ${atualizados}`);
        console.log(`➕ Jogadores criados: ${criados}`);
        console.log(`✓ Sem alterações: ${semAlteracoes}`);
        console.log(`❌ Erros: ${erros}`);
        console.log(`📊 Total processado: ${estatisticasRecalculadas.size}`);
        
        if (inconsistencias.length > 0) {
            console.log(`\n⚠️  INCONSISTÊNCIAS ENCONTRADAS:`);
            inconsistencias.slice(0, 5).forEach(inc => console.log(`   • ${inc}`));
            if (inconsistencias.length > 5) {
                console.log(`   ... e mais ${inconsistencias.length - 5} inconsistências`);
            }
        }
        
        if (vencedoresUnicos.length > 0) {
            console.log(`\n🎯 VENCEDORES SEM JOGADOR CADASTRADO:`);
            vencedoresUnicos.slice(0, 3).forEach(v => console.log(`   • ${v}`));
        }
        
        console.log('\n🎉 Correção concluída com sucesso!');
        
        return {
            success: true,
            message: 'Correção geral concluída',
            timestamp: new Date().toISOString(),
            estatisticas: {
                atualizados,
                criados,
                semAlteracoes,
                erros,
                totalProcessado: estatisticasRecalculadas.size,
                totalPartidas: todasPartidas.length,
                totalJogadoresIniciais: todosJogadores.length
            },
            inconsistencias: {
                total: inconsistencias.length,
                amostra: inconsistencias.slice(0, 10)
            },
            relatorio: relatorio.slice(0, 20) // Retorna apenas os primeiros 20 para não sobrecarregar
        };
        
    } catch (error) {
        console.error('❌ ERRO NA CORREÇÃO GERAL:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ============================================
// FUNÇÃO PARA CORRIGIR JOGADOR ESPECÍFICO
// ============================================
async function corrigirJogadorEspecifico(apelido) {
    try {
        console.log(`🔍 Corrigindo jogador específico: ${apelido}`);
        
        // Conectar se necessário
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
        
        const Jogador = mongoose.models.Jogador;
        const Partida = mongoose.models.Partida;
        
        // Buscar jogador
        const jogador = await Jogador.findOne({ apelido });
        if (!jogador) {
            return {
                success: false,
                error: `Jogador "${apelido}" não encontrado`
            };
        }
        
        console.log(`📊 Jogador encontrado: ${jogador.nome} (${jogador.vitorias}🏆 ${jogador.partidas}🎮)`);
        
        // Contar vitórias reais
        const partidasVencidas = await Partida.find({ vencedor: apelido });
        const vitóriasReais = partidasVencidas.length;
        
        // Contar participações reais
        const todasPartidas = await Partida.find({ 
            participantes: { $in: [apelido] } 
        });
        const partidasReais = todasPartidas.length;
        
        console.log(`📈 Estatísticas reais: ${vitóriasReais} vitórias em ${partidasReais} partidas`);
        
        // Verificar se precisa correção
        const precisaCorrecao = 
            jogador.vitorias !== vitóriasReais || 
            jogador.partidas !== partidasReais;
        
        if (!precisaCorrecao) {
            return {
                success: true,
                message: `Jogador ${apelido} já está com estatísticas corretas`,
                dados: {
                    vitorias: jogador.vitorias,
                    partidas: jogador.partidas,
                    patente: jogador.patente
                },
                partidas_analisadas: {
                    vitorias_encontradas: vitóriasReais,
                    participacoes_encontradas: partidasReais
                }
            };
        }
        
        // Salvar valores antigos
        const valoresAntigos = {
            vitorias: jogador.vitorias,
            partidas: jogador.partidas,
            patente: jogador.patente
        };
        
        // Atualizar jogador
        jogador.vitorias = vitóriasReais;
        jogador.partidas = partidasReais;
        jogador.patente = calcularPatente(vitóriasReais);
        
        await jogador.save();
        
        console.log(`✅ Jogador corrigido: ${valoresAntigos.vitorias}→${vitóriasReais}🏆 ${valoresAntigos.partidas}→${partidasReais}🎮`);
        
        return {
            success: true,
            message: `Jogador ${apelido} corrigido com sucesso`,
            antes: valoresAntigos,
            depois: {
                vitorias: jogador.vitorias,
                partidas: jogador.partidas,
                patente: jogador.patente
            },
            partidas_analisadas: {
                vitorias_encontradas: vitóriasReais,
                participacoes_encontradas: partidasReais
            }
        };
        
    } catch (error) {
        console.error(`❌ Erro ao corrigir jogador ${apelido}:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// FUNÇÃO PARA VERIFICAR CONSISTÊNCIA
// ============================================
async function verificarConsistencia() {
    try {
        console.log('🔍 Verificando consistência dos dados...');
        
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
        
        const Jogador = mongoose.models.Jogador;
        const Partida = mongoose.models.Partida;
        
        // Buscar dados
        const jogadores = await Jogador.find({ ativo: true });
        const partidas = await Partida.find({});
        
        console.log(`📊 Analisando ${jogadores.length} jogadores e ${partidas.length} partidas...`);
        
        const analise = [];
        let consistentes = 0;
        let inconsistentes = 0;
        
        // Analisar cada jogador
        for (const jogador of jogadores) {
            // Contar vitórias reais
            const partidasVencidas = partidas.filter(p => p.vencedor === jogador.apelido).length;
            
            // Contar participações reais
            const participacoes = partidas.filter(p => 
                p.participantes.includes(jogador.apelido)
            ).length;
            
            const consistente = 
                jogador.vitorias === partidasVencidas && 
                jogador.partidas === participacoes;
            
            analise.push({
                apelido: jogador.apelido,
                vitorias_banco: jogador.vitorias,
                vitorias_reais: partidasVencidas,
                partidas_banco: jogador.partidas,
                partidas_reais: participacoes,
                patente_atual: jogador.patente,
                patente_correta: calcularPatente(partidasVencidas),
                consistente: consistente,
                diferenca_vitorias: jogador.vitorias - partidasVencidas,
                diferenca_partidas: jogador.partidas - participacoes
            });
            
            if (consistente) {
                consistentes++;
            } else {
                inconsistentes++;
            }
        }
        
        // Verificar partidas com vencedores/jogadores não cadastrados
        const vencedoresNaoCadastrados = [];
        const participantesNaoCadastrados = [];
        const apelidosJogadores = jogadores.map(j => j.apelido);
        
        partidas.forEach(partida => {
            if (!apelidosJogadores.includes(partida.vencedor)) {
                vencedoresNaoCadastrados.push(partida.vencedor);
            }
            
            partida.participantes.forEach(participante => {
                if (!apelidosJogadores.includes(participante)) {
                    participantesNaoCadastrados.push(participante);
                }
            });
        });
        
        const vencedoresUnicos = [...new Set(vencedoresNaoCadastrados)];
        const participantesUnicos = [...new Set(participantesNaoCadastrados)];
        
        console.log(`✅ Análise concluída: ${consistentes} consistentes, ${inconsistentes} inconsistentes`);
        
        return {
            success: true,
            summary: {
                total_jogadores: jogadores.length,
                total_partidas: partidas.length,
                jogadores_consistentes: consistentes,
                jogadores_inconsistentes: inconsistentes,
                percentual_consistente: Math.round((consistentes / jogadores.length) * 100)
            },
            inconsistencias: {
                vencedores_sem_jogador: vencedoresUnicos,
                participantes_sem_jogador: participantesUnicos,
                total_vencedores_sem_jogador: vencedoresUnicos.length,
                total_participantes_sem_jogador: participantesUnicos.length
            },
            analise: analise.slice(0, 50) // Retorna apenas os primeiros 50
        };
        
    } catch (error) {
        console.error('❌ Erro na verificação de consistência:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// FUNÇÃO PARA RESETAR ESTATÍSTICAS (PERIGOSO!)
// ============================================
async function resetarEstatisticas() {
    try {
        console.log('⚠️  ⚠️  ⚠️  INICIANDO RESET DE ESTATÍSTICAS ⚠️  ⚠️  ⚠️');
        console.log('⚠️  ESTA AÇÃO IRÁ ZERAR TODAS AS ESTATÍSTICAS DOS JOGADORES!');
        
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
        
        const Jogador = mongoose.models.Jogador;
        
        // Zerar estatísticas de todos os jogadores
        const resultado = await Jogador.updateMany(
            { ativo: true },
            { 
                $set: { 
                    vitorias: 0,
                    partidas: 0,
                    patente: 'Cabo 🪖'
                }
            }
        );
        
        console.log(`✅ Reset realizado: ${resultado.modifiedCount} jogadores atualizados`);
        
        return {
            success: true,
            message: `Estatísticas resetadas para ${resultado.modifiedCount} jogadores`,
            jogadores_afetados: resultado.modifiedCount,
            timestamp: new Date().toISOString(),
            aviso: 'Todas as estatísticas foram zeradas. Execute a correção geral para recalcular com base nas partidas.'
        };
        
    } catch (error) {
        console.error('❌ Erro ao resetar estatísticas:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
// ============================================
// FUNÇÃO PARA CALCULAR ESTATÍSTICAS DE UM JOGADOR (PARA A ROTA)
// ============================================
async function calcularEstatisticasJogador(jogador, ano, mes) {
    try {
        console.log(`📊 Calculando estatísticas para: ${jogador}`);
        
        // Usar a função existente
        const resultado = await corrigirJogadorEspecifico(jogador);
        
        // Se ano e mes foram fornecidos, adicionar filtro
        if (ano && mes && resultado.success) {
            resultado.filtro = { ano, mes };
            resultado.mensagem += ` (apenas partidas de ${mes}/${ano})`;
        }
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Erro ao calcular estatísticas do jogador:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// FUNÇÃO PARA FORÇAR RECÁLCULO COMPLETO (PARA A ROTA)
// ============================================
async function forcarRecalculoCompleto() {
    try {
        console.log('🔄 Forçando recálculo completo...');
        
        // Usar a função existente
        const resultado = await corrigirTodasEstatisticas();
        
        return resultado;
        
    } catch (error) {
        console.error('❌ Erro no recálculo completo:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ============================================
// FUNÇÃO PARA RECALCULAR APENAS UM JOGADOR (ALIAS)
// ============================================
async function recalcularJogador(apelido) {
    return await corrigirJogadorEspecifico(apelido);
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================
module.exports = {
    corrigirTodasEstatisticas,
    corrigirJogadorEspecifico,
    verificarConsistencia,
    resetarEstatisticas,
    calcularPatente,
    // NOVAS FUNÇÕES
    calcularEstatisticasJogador,
    forcarRecalculoCompleto,
    recalcularJogador
};
