// server/vencedores-mensais.js - CÓDIGO COMPLETO
// Sistema de registro de vencedores mensais (2026 em diante)

const mongoose = require('mongoose');

// ============================================
// FUNÇÃO PARA OBTER O MODELO DE VENCEDORES MENSAIS
// ============================================
function getVencedorMensalModel() {
    try {
        // Tenta pegar o modelo se já existir (definido no index.js)
        return mongoose.model('VencedorMensal');
    } catch (error) {
        // Se não existir, usa um fallback seguro
        console.warn('⚠️  Modelo VencedorMensal não encontrado. Criando modelo de fallback...');
        
        const vencedorMensalSchema = new mongoose.Schema({
            ano: { 
                type: Number, 
                required: true,
                min: 2026
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
            participantes_mes: [String],
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

        vencedorMensalSchema.index({ ano: 1, mes: 1 }, { unique: true });
        return mongoose.model('VencedorMensal', vencedorMensalSchema);
    }
}

// ============================================
// FUNÇÃO PRINCIPAL - REGISTRAR VENCEDOR DO MÊS
// ============================================
async function registrarVencedorMensal(ano, mes) {
    const VencedorMensal = getVencedorMensalModel();
    
    try {
        console.log(`📅 Iniciando registro do mês ${mes}/${ano}...`);
        
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1; // 1-12
        
        // Nomes dos meses em português
        const nomesMeses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        
        // ============ VALIDAÇÕES ============
        
        // 1. VALIDAÇÃO: Só 2026 em diante
        if (ano < 2026) {
            return { 
                success: false, 
                error: '❌ O sistema de vencedores mensais começa em 2026. Para 2025, use o ranking anual fixo já exibido no dashboard.',
                permiteRegistro: false,
                codigoErro: 'ANO_2025'
            };
        }
        
        // 2. VALIDAÇÃO: Mês válido (1-12)
        if (mes < 1 || mes > 12) {
            return { 
                success: false, 
                error: '❌ Mês inválido. Deve ser entre 1 (Janeiro) e 12 (Dezembro).',
                permiteRegistro: false,
                codigoErro: 'MES_INVALIDO'
            };
        }
        
        // 3. VALIDAÇÃO: Não pode registrar mês corrente ou futuro
        if (ano > anoAtual || (ano === anoAtual && mes >= mesAtual)) {
            if (ano === anoAtual && mes === mesAtual) {
                const proximoMes = mes === 12 ? 1 : mes + 1;
                const nomeProximoMes = nomesMeses[proximoMes - 1];
                
                return { 
                    success: false, 
                    error: `⏳ ${nomesMeses[mes-1]}/${ano} ainda não encerrou.`,
                    mensagemAmigavel: `O mês de ${nomesMeses[mes-1]} ainda está em andamento. O vencedor será registrado automaticamente no dia 1º de ${nomeProximoMes}.`,
                    permiteRegistro: false,
                    codigoErro: 'MES_CORRENTE'
                };
            }
            
            if (ano > anoAtual || (ano === anoAtual && mes > mesAtual)) {
                return { 
                    success: false, 
                    error: `🚫 ${nomesMeses[mes-1]}/${ano} é um mês futuro. Não é possível registrar.`,
                    permiteRegistro: false,
                    codigoErro: 'MES_FUTURO'
                };
            }
        }
        
        // 4. VALIDAÇÃO: Verificar se já existe registro
        const existe = await VencedorMensal.findOne({ ano, mes });
        if (existe) {
            return { 
                success: false, 
                error: `⚠️ ${nomesMeses[mes-1]}/${ano} já registrado. Vencedor: ${existe.apelido_vencedor}`,
                data: existe,
                permiteRegistro: false,
                codigoErro: 'JA_REGISTRADO'
            };
        }
        
        // ============ CÁLCULO DO VENCEDOR ============
        
        // Calcular datas do mês
        const inicioMes = new Date(ano, mes - 1, 1);
        const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
        
        console.log(`📊 Período: ${inicioMes.toLocaleDateString()} a ${fimMes.toLocaleDateString()}`);
        
        // Buscar partidas do mês
        const Partida = mongoose.model('Partida');
        const partidasMes = await Partida.find({
            data: { $gte: inicioMes, $lte: fimMes }
        });
        
        console.log(`🎮 Partidas encontradas no mês: ${partidasMes.length}`);
        
        // Se não houver partidas, criar registro vazio
        if (partidasMes.length === 0) {
            const registroVazio = new VencedorMensal({
                ano,
                mes,
                mes_nome: nomesMeses[mes - 1],
                apelido_vencedor: 'SEM VENCEDOR',
                nome_vencedor: 'Nenhuma partida registrada',
                patente_vencedor: '-',
                vitorias_mes: 0,
                partidas_mes: 0,
                performance_mes: 0,
                pontuacao_mes: 0,
                participantes_mes: [],
                observacoes: `Nenhuma partida registrada em ${nomesMeses[mes-1]}/${ano}`,
                status: 'sem_partidas'
            });
            
            await registroVazio.save();
            
            return {
                success: true,
                message: `ℹ️ ${nomesMeses[mes-1]}/${ano} registrado sem vencedor (nenhuma partida)`,
                data: registroVazio,
                semPartidas: true
            };
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
            return { 
                success: false, 
                error: `Erro ao calcular ranking do mês ${mes}/${ano}`,
                permiteRegistro: false 
            };
        }
        
        // Pegar vencedor (1º lugar)
        const vencedor = ranking[0];
        
        // Buscar informações do vencedor
        const Jogador = mongoose.model('Jogador');
        const jogadorVencedor = await Jogador.findOne({ apelido: vencedor.apelido });
        
        // ============ CRIAR REGISTRO ============
        
        const registro = new VencedorMensal({
            ano,
            mes,
            mes_nome: nomesMeses[mes - 1],
            apelido_vencedor: vencedor.apelido,
            nome_vencedor: jogadorVencedor ? jogadorVencedor.nome : vencedor.apelido,
            patente_vencedor: jogadorVencedor ? jogadorVencedor.patente : 'Cabo 🪖',
            vitorias_mes: vencedor.vitorias,
            partidas_mes: vencedor.partidas,
            performance_mes: vencedor.performance,
            pontuacao_mes: vencedor.pontuacao,
            participantes_mes: ranking.slice(0, 3).map(j => j.apelido),
            observacoes: `Registrado em ${hoje.toLocaleDateString('pt-BR')} - ${vencedor.vitorias} vitórias em ${vencedor.partidas} partidas (${vencedor.performance}%)`
        });
        
        await registro.save();
        
        console.log(`✅ Vencedor registrado: ${vencedor.apelido} (${vencedor.vitorias} vitórias)`);
        
        return {
            success: true,
            message: `🏆 ${nomesMeses[mes-1]}/${ano} registrado com sucesso!`,
            data: registro,
            ranking: ranking.slice(0, 5), // Top 5 para referência
            estatisticas: {
                total_partidas: partidasMes.length,
                total_jogadores: ranking.length,
                vencedor: {
                    apelido: vencedor.apelido,
                    vitorias: vencedor.vitorias,
                    partidas: vencedor.partidas,
                    performance: vencedor.performance,
                    patente: jogadorVencedor?.patente || 'Cabo 🪖'
                }
            }
        };
        
    } catch (error) {
        console.error(`❌ Erro ao registrar vencedor do mês ${mes}/${ano}:`, error);
        
        // Tratamento específico para erro de índice único (duplicata)
        if (error.code === 11000) {
            return { 
                success: false, 
                error: `Mês ${mes}/${ano} já está registrado no banco de dados.`,
                permiteRegistro: false,
                codigoErro: 'DUPLICATA'
            };
        }
        
        return { 
            success: false, 
            error: `Erro interno: ${error.message}`,
            permiteRegistro: false,
            codigoErro: 'ERRO_INTERNO'
        };
    }
}

// ============================================
// FUNÇÃO PARA VERIFICAR MESES PENDENTES (2026+)
// ============================================
async function verificarEVencerMesesPendentes() {
    const VencedorMensal = getVencedorMensalModel();
    
    try {
        console.log('🔍 Verificando meses pendentes (2026 em diante)...');
        
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;
        
        const resultados = [];
        const mesesPendentes = [];
        
        // Verificar de 2026 até ano atual
        for (let ano = 2026; ano <= anoAtual; ano++) {
            // Último mês a verificar: ano atual = mês anterior; outros anos = dezembro
            const ultimoMes = (ano === anoAtual) ? mesAtual - 1 : 12;
            
            for (let mes = 1; mes <= ultimoMes; mes++) {
                // Verificar se já existe registro
                const existe = await VencedorMensal.findOne({ ano, mes });
                
                if (!existe) {
                    mesesPendentes.push({ ano, mes });
                }
            }
        }
        
        console.log(`📋 Meses pendentes encontrados: ${mesesPendentes.length}`);
        
        // Registrar cada mês pendente
        for (const { ano, mes } of mesesPendentes) {
            console.log(`   Processando ${mes}/${ano}...`);
            
            const resultado = await registrarVencedorMensal(ano, mes);
            
            resultados.push({
                ano,
                mes,
                success: resultado.success,
                message: resultado.message || resultado.error,
                vencedor: resultado.data?.apelido_vencedor || 'Nenhum',
                semPartidas: resultado.semPartidas || false
            });
            
            // Aguardar 1 segundo entre registros
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        return {
            success: true,
            message: `Verificação concluída: ${resultados.length} meses processados`,
            totalMeses: resultados.length,
            mesesProcessados: resultados.length,
            resultados
        };
        
    } catch (error) {
        console.error('❌ Erro na verificação de meses pendentes:', error);
        return { 
            success: false, 
            error: error.message,
            resultados: []
        };
    }
}

// ============================================
// FUNÇÃO PARA OBTER VENCEDORES POR ANO
// ============================================
async function obterVencedoresPorAno(ano) {
    const VencedorMensal = getVencedorMensalModel();
    
    try {
        // Só retorna se for 2026+
        if (ano < 2026) {
            return {
                success: false,
                error: 'Vencedores mensais disponíveis apenas a partir de 2026',
                ano
            };
        }
        
        const vencedores = await VencedorMensal.find({ ano })
            .sort({ mes: 1 })
            .lean(); // Retorna objetos JavaScript simples
        
        // Preencher meses faltantes com "pendente"
        const todosMeses = [];
        for (let mes = 1; mes <= 12; mes++) {
            const vencedorMes = vencedores.find(v => v.mes === mes);
            
            if (vencedorMes) {
                todosMeses.push(vencedorMes);
            } else {
                const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                
                todosMeses.push({
                    ano,
                    mes,
                    mes_nome: nomesMeses[mes - 1],
                    apelido_vencedor: 'PENDENTE',
                    status: 'pendente',
                    vitorias_mes: 0,
                    partidas_mes: 0,
                    performance_mes: 0,
                    observacoes: `Aguardando fechamento do mês ou registro manual`
                });
            }
        }
        
        return {
            success: true,
            ano,
            total_meses: vencedores.length,
            todos_meses: todosMeses, // Sempre 12 meses
            vencedores: vencedores
        };
    } catch (error) {
        console.error(`❌ Erro ao buscar vencedores de ${ano}:`, error);
        return { 
            success: false, 
            error: error.message,
            ano 
        };
    }
}

// ============================================
// FUNÇÃO PARA OBTER ANOS DISPONÍVEIS
// ============================================
async function obterAnosDisponiveis() {
    const VencedorMensal = getVencedorMensalModel();
    
    try {
        const anos = await VencedorMensal.aggregate([
            { 
                $match: { ano: { $gte: 2026 } } // Só anos a partir de 2026
            },
            { 
                $group: { 
                    _id: "$ano",
                    total_meses: { $sum: 1 },
                    ultimo_registro: { $max: "$data_registro" }
                } 
            },
            { 
                $sort: { _id: -1 } // Ordenar do mais recente
            }
        ]);
        
        // Adicionar ano atual se não existir ainda
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        
        if (anoAtual >= 2026 && !anos.find(a => a._id === anoAtual)) {
            anos.unshift({
                _id: anoAtual,
                total_meses: 0,
                ultimo_registro: null,
                status: 'ano_atual'
            });
        }
        
        return {
            success: true,
            anos: anos.map(a => ({
                ano: a._id,
                total_meses: a.total_meses,
                ultimo_registro: a.ultimo_registro,
                status: a.status || 'ativo'
            }))
        };
    } catch (error) {
        console.error('❌ Erro ao buscar anos disponíveis:', error);
        return { 
            success: false, 
            error: error.message,
            anos: [] 
        };
    }
}

// ============================================
// FUNÇÃO PARA OBTER STATUS DO SISTEMA
// ============================================
async function obterStatusSistema() {
    const VencedorMensal = getVencedorMensalModel();
    
    try {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth() + 1;
        
        // Contar registros totais
        const totalRegistros = await VencedorMensal.countDocuments();
        
        // Último mês registrado
        const ultimoRegistro = await VencedorMensal.findOne()
            .sort({ ano: -1, mes: -1 });
        
        // Meses pendentes do ano atual (apenas 2026+)
        let mesesPendentesAnoAtual = 0;
        if (anoAtual >= 2026) {
            for (let mes = 1; mes < mesAtual; mes++) {
                const existe = await VencedorMensal.findOne({ 
                    ano: anoAtual, 
                    mes: mes 
                });
                if (!existe) mesesPendentesAnoAtual++;
            }
        }
        
        return {
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
                ultimo: ultimoRegistro ? {
                    ano: ultimoRegistro.ano,
                    mes: ultimoRegistro.mes,
                    mes_nome: ultimoRegistro.mes_nome,
                    vencedor: ultimoRegistro.apelido_vencedor,
                    data: ultimoRegistro.data_registro
                } : null
            },
            pendentes: {
                meses_pendentes_ano_atual: mesesPendentesAnoAtual,
                status: mesesPendentesAnoAtual === 0 ? 'ATUALIZADO' : 'PENDENTE'
            }
        };
    } catch (error) {
        console.error('❌ Erro ao obter status do sistema:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================
// FUNÇÃO PARA INICIALIZAR MESES DE 2026
// ============================================
async function inicializarMeses2026() {
    const VencedorMensal = getVencedorMensalModel();
    
    try {
        console.log('🔄 Inicializando meses de 2026...');
        
        const resultados = [];
        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        // Criar registros "pendentes" para todos os meses de 2026
        for (let mes = 1; mes <= 12; mes++) {
            try {
                const existe = await VencedorMensal.findOne({ ano: 2026, mes });
                
                if (!existe) {
                    const registroPendente = new VencedorMensal({
                        ano: 2026,
                        mes: mes,
                        mes_nome: nomesMeses[mes - 1],
                        apelido_vencedor: 'PENDENTE',
                        nome_vencedor: 'Aguardando fechamento',
                        patente_vencedor: '-',
                        vitorias_mes: 0,
                        partidas_mes: 0,
                        performance_mes: 0,
                        pontuacao_mes: 0,
                        participantes_mes: [],
                        observacoes: `Mês ${nomesMeses[mes-1]}/2026 - Aguardando partidas`,
                        status: 'pendente'
                    });
                    
                    await registroPendente.save();
                    resultados.push({ mes, status: 'criado', nome: nomesMeses[mes-1] });
                } else {
                    resultados.push({ mes, status: 'existente', nome: nomesMeses[mes-1] });
                }
            } catch (error) {
                resultados.push({ mes, status: 'erro', nome: nomesMeses[mes-1], error: error.message });
            }
        }
        
        return {
            success: true,
            message: 'Meses de 2026 inicializados',
            total_meses: 12,
            resultados
        };
    } catch (error) {
        console.error('❌ Erro ao inicializar 2026:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================
module.exports = {
    getVencedorMensalModel,
    registrarVencedorMensal,
    verificarEVencerMesesPendentes,
    obterVencedoresPorAno,
    obterAnosDisponiveis,
    obterStatusSistema,
    inicializarMeses2026
};
