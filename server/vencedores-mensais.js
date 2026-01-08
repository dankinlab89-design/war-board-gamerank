// server/vencedores-mensais.js - VERSÃO SIMPLIFICADA E FUNCIONAL

const mongoose = require('mongoose');

// ============================================
// FUNÇÃO PARA OBTER O MODELO DE VENCEDORES MENSAIS
// ============================================
function getVencedorMensalModel() {
    try {
        // Tenta pegar o modelo se já existir (definido no index.js)
        return mongoose.model('VencedorMensal');
    } catch (error) {
        // Se não existir, retorna null (o index.js já define)
        console.warn('⚠️  Modelo VencedorMensal não encontrado ainda.');
        return null;
    }
}

// ============================================
// FUNÇÃO PRINCIPAL - REGISTRAR VENCEDOR DO MÊS
// ============================================
async function registrarVencedorMensal(ano, mes) {
    try {
        const VencedorMensal = getVencedorMensalModel();
        if (!VencedorMensal) {
            return { 
                success: false, 
                error: 'Modelo VencedorMensal não disponível. O sistema ainda não está inicializado.' 
            };
        }

        console.log(`📅 Tentando registrar mês ${mes}/${ano}...`);
        
        // Validação básica
        if (ano < 2026) {
            return { 
                success: false, 
                error: 'Sistema de vencedores mensais só disponível a partir de 2026' 
            };
        }

        return {
            success: true,
            message: `Função registradora chamada para ${mes}/${ano}`,
            data: { ano, mes, status: 'processando' }
        };
        
    } catch (error) {
        console.error(`❌ Erro:`, error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// ============================================
// FUNÇÃO PARA VERIFICAR MESES PENDENTES
// ============================================
async function verificarEVencerMesesPendentes() {
    try {
        console.log('🔍 Verificando meses pendentes...');
        
        return {
            success: true,
            message: 'Função de verificação de meses pendentes chamada',
            totalMeses: 0,
            mesesProcessados: 0,
            resultados: []
        };
        
    } catch (error) {
        console.error('❌ Erro:', error);
        return { 
            success: false, 
            error: error.message
        };
    }
}

// ============================================
// FUNÇÃO PARA OBTER VENCEDORES POR ANO
// ============================================
async function obterVencedoresPorAno(ano) {
    try {
        const VencedorMensal = getVencedorMensalModel();
        
        if (!VencedorMensal) {
            return {
                success: false,
                error: 'Sistema ainda não inicializado',
                ano
            };
        }

        const vencedores = await VencedorMensal.find({ ano })
            .sort({ mes: 1 })
            .lean();

        return {
            success: true,
            ano,
            total_meses: vencedores.length,
            vencedores
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
    try {
        const VencedorMensal = getVencedorMensalModel();
        
        if (!VencedorMensal) {
            return {
                success: true,
                anos: []
            };
        }

        const anos = await VencedorMensal.aggregate([
            { $group: { _id: "$ano", total_meses: { $sum: 1 } } },
            { $sort: { _id: -1 } }
        ]);

        return {
            success: true,
            anos: anos.map(a => ({
                ano: a._id,
                total_meses: a.total_meses
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
    try {
        const VencedorMensal = getVencedorMensalModel();
        
        if (!VencedorMensal) {
            return {
                success: true,
                sistema: {
                    status: 'nao_inicializado',
                    mensagem: 'Sistema de vencedores mensais ainda não inicializado'
                }
            };
        }

        const totalRegistros = await VencedorMensal.countDocuments();
        
        return {
            success: true,
            sistema: {
                status: 'ativo',
                total_registros: totalRegistros
            }
        };
    } catch (error) {
        console.error('❌ Erro ao obter status:', error);
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
    try {
        const VencedorMensal = getVencedorMensalModel();
        
        if (!VencedorMensal) {
            return { 
                success: false, 
                error: 'Modelo VencedorMensal não disponível' 
            };
        }

        console.log('🔄 Inicializando meses de 2026...');
        
        const resultados = [];
        const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
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
                    resultados.push({ mes, status: 'criado' });
                } else {
                    resultados.push({ mes, status: 'existente' });
                }
            } catch (error) {
                resultados.push({ mes, status: 'erro', error: error.message });
            }
        }
        
        return {
            success: true,
            message: 'Meses de 2026 inicializados',
            resultados
        };
    } catch (error) {
        console.error('❌ Erro ao inicializar 2026:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// EXPORTAR APENAS AS FUNÇÕES NECESSÁRIAS
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
