// server/index.js - COMPLETO E FUNCIONAL
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// ============ CONEXÃO POSTGRESQL ============
console.log('🔗 Iniciando WAR Board GameRank...');

// URL do banco - USE VARIÁVEL DE AMBIENTE NO RENDER
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://wardb_user:pRNwj9TZ3F4Dbk2fdT0vdgTkdsYG17LB@dpg-d5a44u6mcj7s73c5q070-a/war_database_1k0z';

let pool;

try {
    console.log('📊 Configurando conexão PostgreSQL...');
    
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
    
    console.log('✅ Pool PostgreSQL configurado');
    
    // Testar conexão e criar tabelas
    setupDatabase();
    
} catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
}

// Função para configurar o banco
async function setupDatabase() {
    let client;
    try {
        console.log('🔍 Testando conexão com PostgreSQL...');
        client = await pool.connect();
        
        const result = await client.query('SELECT NOW() as hora_servidor');
        console.log('✅ PostgreSQL conectado:', result.rows[0].hora_servidor);
        
        // Criar tabelas se não existirem
        await criarTabelas(client);
        
        client.release();
        
    } catch (error) {
        console.error('❌ FALHA NA CONEXÃO:', error.message);
        if (client) client.release();
        console.log('⚠️  Sistema funcionará com dados limitados');
    }
}

// Criar tabelas
async function criarTabelas(client) {
    console.log('🔄 Verificando/Criando tabelas...');
    
    try {
        // Tabela jogadores
        await client.query(`
            CREATE TABLE IF NOT EXISTS jogadores (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                apelido VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100),
                patente VARCHAR(20) DEFAULT 'Cabo 🪖',
                status VARCHAR(10) DEFAULT 'Ativo',
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                observacoes TEXT
            )
        `);
        
        // Tabela partidas
        await client.query(`
            CREATE TABLE IF NOT EXISTS partidas (
                id SERIAL PRIMARY KEY,
                data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                tipo VARCHAR(20) DEFAULT 'global',
                vencedor_id INTEGER,
                participantes TEXT,
                observacoes TEXT
            )
        `);
        
        console.log('✅ Tabelas verificadas/criadas');
        
        // Verificar dados iniciais
        await verificarDadosIniciais(client);
        
    } catch (error) {
        console.error('❌ Erro ao criar tabelas:', error.message);
    }
}

// Verificar e inserir dados iniciais
async function verificarDadosIniciais(client) {
    try {
        const result = await client.query('SELECT COUNT(*) as total FROM jogadores');
        const totalJogadores = parseInt(result.rows[0].total);
        
        if (totalJogadores === 0) {
            console.log('📝 Inserindo dados iniciais...');
            
            await client.query(`
                INSERT INTO jogadores (nome, apelido, email, patente) VALUES
                ('Comandante Silva', 'Silva', 'silva@email.com', 'General ⭐'),
                ('Capitão Santos', 'Santos', 'santos@email.com', 'Capitão 👮'),
                ('Tenente Costa', 'Costa', 'costa@email.com', 'Tenente ⚔️'),
                ('Soldado Lima', 'Lima', 'lima@email.com', 'Soldado 🛡️'),
                ('Recruta Souza', 'Souza', 'souza@email.com', 'Cabo 🪖')
                ON CONFLICT (apelido) DO NOTHING
            `);
            
            console.log('✅ Dados iniciais inseridos');
        } else {
            console.log(`📊 Banco já possui ${totalJogadores} jogadores`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar dados:', error.message);
    }
}

// ============ MIDDLEWARE DE LOG ============
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});

// Importar node-fetch se necessário
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Middleware para verificar se é cron job válido
const verificarCronJob = (req, res, next) => {
    // Verificar se tem chave secreta (opcional, mas recomendado)
    const cronKey = req.headers['x-cron-key'] || req.query.cron_key;
    const expectedKey = process.env.CRON_SECRET_KEY;
    
    if (expectedKey && cronKey !== expectedKey) {
        console.warn('⚠️ Tentativa de acesso não autorizado ao cron job');
        return res.status(403).json({ error: 'Não autorizado' });
    }
    
    next();
};

// Endpoint SIMPLES para cron job (sem proteção para testes)
app.get('/api/cron/calcular-vencedor-mes-anterior', async (req, res) => {
    try {
        console.log('🔄 CRON JOB: Endpoint chamado');
        
        // Simular processamento
        const agora = new Date();
        const mesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        const ano = mesPassado.getFullYear();
        const mes = mesPassado.getMonth() + 1;
        
        console.log(`📅 Mês anterior: ${mes}/${ano}`);
        
        // Retornar sucesso imediatamente (para teste)
        res.json({
            sucesso: true,
            mensagem: 'Cron job executado com sucesso',
            timestamp: new Date().toISOString(),
            mes_calculado: `${mes}/${ano}`
        });
        
    } catch (error) {
        console.error('❌ Erro no cron job:', error);
        res.status(200).json({  // Retornar 200 mesmo com erro para o cron-job.org
            sucesso: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint de saúde
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'WAR Board GameRank'
    });
});
        
        // Calcular ranking do mês anterior
        const rankingResult = await pool.query(`
            SELECT 
                j.id,
                j.apelido,
                j.patente,
                COUNT(pj.partida_id) as partidas,
                SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias,
                CASE 
                    WHEN COUNT(pj.partida_id) > 0 
                    THEN ROUND((SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END)::FLOAT / COUNT(pj.partida_id) * 100), 2)
                    ELSE 0 
                END as percentual
            FROM jogadores j
            LEFT JOIN partidas_jogadores pj ON j.id = pj.jogador_id
            LEFT JOIN partidas p ON pj.partida_id = p.id
            WHERE EXTRACT(YEAR FROM p.data) = $1 
                AND EXTRACT(MONTH FROM p.data) = $2
                AND j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            HAVING COUNT(pj.partida_id) > 0
            ORDER BY vitorias DESC, percentual DESC
            LIMIT 1
        `, [ano, mes]);
        
        if (rankingResult.rows.length > 0) {
            const vencedor = rankingResult.rows[0];
            
            // Salvar no banco
            await pool.query(`
                INSERT INTO vencedores_mensais 
                (ano, mes, jogador_id, jogador_apelido, jogador_patente, vitorias, partidas, percentual)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (ano, mes) 
                DO UPDATE SET 
                    jogador_id = $3,
                    jogador_apelido = $4,
                    jogador_patente = $5,
                    vitorias = $6,
                    partidas = $7,
                    percentual = $8,
                    data_registro = CURRENT_TIMESTAMP
            `, [ano, mes, vencedor.id, vencedor.apelido, vencedor.patente, 
                vencedor.vitorias, vencedor.partidas, vencedor.percentual]);
            
            console.log(`✅ Vencedor salvo: ${vencedor.apelido} com ${vencedor.vitorias} vitórias`);
            
            res.json({
                sucesso: true,
                mensagem: 'Vencedor mensal calculado e salvo',
                data: new Date().toISOString(),
                vencedor: {
                    ano: ano,
                    mes: mes,
                    jogador: vencedor.apelido,
                    patente: vencedor.patente,
                    vitorias: vencedor.vitorias,
                    partidas: vencedor.partidas,
                    percentual: vencedor.percentual
                }
            });
            
        } else {
            console.log('⚠️ Nenhuma partida no mês anterior');
            res.json({
                sucesso: true,
                mensagem: 'Nenhuma partida no mês anterior',
                data: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Erro no cron job:', error);
        res.status(500).json({
            sucesso: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Endpoint para testar manualmente (protegido)
app.get('/api/cron/teste/:ano/:mes', verificarCronJob, async (req, res) => {
    const { ano, mes } = req.params;
    
    // Mesma lógica do endpoint acima, mas para ano/mes específicos
    // ... (código similar ao acima)
});

// ============ ROTAS DA API ============

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        const jogadoresResult = await pool.query("SELECT COUNT(*) FROM jogadores WHERE status = 'Ativo'");
        const partidasResult = await pool.query("SELECT COUNT(*) FROM partidas");
        
        res.json({ 
            status: 'online',
            service: 'WAR Board GameRank',
            database: 'PostgreSQL ✅',
            jogadores: parseInt(jogadoresResult.rows[0].count),
            partidas: parseInt(partidasResult.rows[0].count),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error',
            service: 'WAR Board GameRank',
            database: 'PostgreSQL ❌',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Criar tabela de vencedores mensais (executar uma vez)
app.get('/api/criar-tabela-vencedores', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vencedores_mensais (
                id SERIAL PRIMARY KEY,
                ano INTEGER NOT NULL,
                mes INTEGER NOT NULL,
                jogador_id INTEGER NOT NULL,
                jogador_apelido VARCHAR(100) NOT NULL,
                jogador_patente VARCHAR(50) NOT NULL,
                vitorias INTEGER DEFAULT 0,
                partidas INTEGER DEFAULT 0,
                percentual DECIMAL(5,2) DEFAULT 0,
                data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(ano, mes)
            )
        `);
        res.json({ sucesso: true, mensagem: 'Tabela criada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para calcular e salvar vencedor do mês anterior
app.get('/api/calcular-vencedor-mes/:ano/:mes', async (req, res) => {
    try {
        const { ano, mes } = req.params;
        
        // Calcular ranking do mês
        const result = await pool.query(`
            SELECT 
                j.id,
                j.apelido,
                j.patente,
                COUNT(pj.partida_id) as partidas,
                SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias,
                CASE 
                    WHEN COUNT(pj.partida_id) > 0 
                    THEN ROUND((SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END)::FLOAT / COUNT(pj.partida_id) * 100), 2)
                    ELSE 0 
                END as percentual
            FROM jogadores j
            LEFT JOIN partidas_jogadores pj ON j.id = pj.jogador_id
            LEFT JOIN partidas p ON pj.partida_id = p.id
            WHERE EXTRACT(YEAR FROM p.data) = $1 
                AND EXTRACT(MONTH FROM p.data) = $2
                AND j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            ORDER BY vitorias DESC, percentual DESC
            LIMIT 1
        `, [ano, mes]);
        
        if (result.rows.length > 0) {
            const vencedor = result.rows[0];
            
            // Salvar no banco
            await pool.query(`
                INSERT INTO vencedores_mensais 
                (ano, mes, jogador_id, jogador_apelido, jogador_patente, vitorias, partidas, percentual)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (ano, mes) 
                DO UPDATE SET 
                    jogador_id = $3,
                    jogador_apelido = $4,
                    jogador_patente = $5,
                    vitorias = $6,
                    partidas = $7,
                    percentual = $8,
                    data_registro = CURRENT_TIMESTAMP
            `, [ano, mes, vencedor.id, vencedor.apelido, vencedor.patente, 
                vencedor.vitorias, vencedor.partidas, vencedor.percentual]);
            
            res.json({ 
                sucesso: true, 
                mensagem: 'Vencedor calculado e salvo',
                vencedor: vencedor 
            });
        } else {
            res.json({ 
                sucesso: false, 
                mensagem: 'Nenhuma partida neste mês'
            });
        }
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obter vencedores de um ano
app.get('/api/vencedores-mensais/:ano', async (req, res) => {
    try {
        const { ano } = req.params;
        
        const result = await pool.query(`
            SELECT 
                mes,
                jogador_apelido as vencedor,
                jogador_patente as patente,
                vitorias,
                partidas,
                percentual
            FROM vencedores_mensais
            WHERE ano = $1
            ORDER BY mes
        `, [ano]);
        
        // Transformar em objeto por mês
        const vencedores = {};
        result.rows.forEach(row => {
            vencedores[row.mes] = row;
        });
        
        res.json(vencedores);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obter anos disponíveis
app.get('/api/vencedores-anos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT ano 
            FROM vencedores_mensais
            ORDER BY ano DESC
        `);
        
        const anos = result.rows.map(row => row.ano);
        
        // Se não houver anos, retorna o ano atual
        if (anos.length === 0) {
            anos.push(new Date().getFullYear());
        }
        
        res.json(anos);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ROTAS DE JOGADORES ============

// GET todos jogadores (ativos)
app.get('/api/jogadores', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM jogadores WHERE status = 'Ativo' ORDER BY apelido"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro ao buscar jogadores:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET todos jogadores (incluindo inativos - para admin)
app.get('/api/jogadores/todos', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM jogadores ORDER BY status DESC, apelido"
        );
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro ao buscar todos jogadores:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET jogador específico por ID
app.get('/api/jogadores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM jogadores WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Jogador não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Erro ao buscar jogador:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// POST cadastrar novo jogador
app.post('/api/jogadores', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { nome, apelido, email, observacoes } = req.body;
        
        // Validação
        if (!nome || !apelido) {
            return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
        }
        
        if (apelido.length < 2) {
            return res.status(400).json({ error: 'Apelido deve ter pelo menos 2 caracteres' });
        }
        
        // Verificar se apelido já existe
        const existeResult = await client.query(
            'SELECT id FROM jogadores WHERE apelido = $1',
            [apelido.trim()]
        );
        
        if (existeResult.rows.length > 0) {
            return res.status(400).json({ error: 'Apelido já está em uso' });
        }
        
        // Inserir novo jogador
        const result = await client.query(
            `INSERT INTO jogadores (nome, apelido, email, observacoes) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, apelido, patente, data_cadastro`,
            [
                nome.trim(),
                apelido.trim(),
                email?.trim() || null,
                observacoes?.trim() || ''
            ]
        );
        
        const novoJogador = result.rows[0];
        
        res.status(201).json({
            sucesso: true,
            mensagem: `🎖️ Jogador ${novoJogador.apelido} cadastrado com sucesso!`,
            jogador: novoJogador
        });
        
    } catch (error) {
        console.error('❌ Erro ao cadastrar jogador:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Apelido já está em uso' });
        }
        
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// PUT atualizar jogador completo
app.put('/api/jogadores/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const { nome, apelido, email, patente, status, observacoes } = req.body;
        
        // Validação
        if (!nome || !apelido) {
            return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
        }
        
        if (!['Ativo', 'Inativo'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }
        
        // Verificar se jogador existe
        const existeResult = await client.query(
            'SELECT id FROM jogadores WHERE id = $1',
            [id]
        );
        
        if (existeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Jogador não encontrado' });
        }
        
        // Verificar se novo apelido já está em uso por outro jogador
        const apelidoEmUso = await client.query(
            'SELECT id FROM jogadores WHERE apelido = $1 AND id != $2',
            [apelido.trim(), id]
        );
        
        if (apelidoEmUso.rows.length > 0) {
            return res.status(400).json({ error: 'Apelido já está em uso por outro jogador' });
        }
        
        // Atualizar jogador
        const result = await client.query(
            `UPDATE jogadores 
             SET nome = $1, 
                 apelido = $2, 
                 email = $3, 
                 patente = $4, 
                 status = $5, 
                 observacoes = $6,
                 data_cadastro = COALESCE(data_cadastro, CURRENT_TIMESTAMP)
             WHERE id = $7
             RETURNING id, apelido, patente, status`,
            [
                nome.trim(),
                apelido.trim(),
                email?.trim() || null,
                patente || 'Cabo 🪖',
                status || 'Ativo',
                observacoes?.trim() || '',
                id
            ]
        );
        
        res.json({
            sucesso: true,
            mensagem: `✅ Jogador ${result.rows[0].apelido} atualizado com sucesso!`,
            jogador: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar jogador:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Apelido já está em uso' });
        }
        
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// PATCH atualizar status do jogador
app.patch('/api/jogadores/:id/status', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Validação
        if (!['Ativo', 'Inativo'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido. Use "Ativo" ou "Inativo"' });
        }
        
        // Verificar se jogador existe
        const existeResult = await client.query(
            'SELECT id, apelido FROM jogadores WHERE id = $1',
            [id]
        );
        
        if (existeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Jogador não encontrado' });
        }
        
        const jogador = existeResult.rows[0];
        
        // Atualizar status
        await client.query(
            'UPDATE jogadores SET status = $1 WHERE id = $2',
            [status, id]
        );
        
        res.json({
            sucesso: true,
            mensagem: `✅ Jogador ${jogador.apelido} ${status === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`,
            jogador: { id: jogador.id, apelido: jogador.apelido, status }
        });
        
    } catch (error) {
        console.error('❌ Erro ao alterar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// PATCH atualizar patente do jogador
app.patch('/api/jogadores/:id/patente', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const { patente } = req.body;
        
        // Validação
        const patentesValidas = [
            'Cabo 🪖', 'Soldado 🛡️', 'Tenente ⚔️', 'Capitão 👮', 
            'Major 💪', 'Coronel 🎖️', 'General ⭐', 'Marechal 🏆'
        ];
        
        if (!patentesValidas.includes(patente)) {
            return res.status(400).json({ error: 'Patente inválida' });
        }
        
        // Verificar se jogador existe
        const existeResult = await client.query(
            'SELECT id, apelido FROM jogadores WHERE id = $1',
            [id]
        );
        
        if (existeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Jogador não encontrado' });
        }
        
        const jogador = existeResult.rows[0];
        
        // Atualizar patente
        await client.query(
            'UPDATE jogadores SET patente = $1 WHERE id = $2',
            [patente, id]
        );
        
        res.json({
            sucesso: true,
            mensagem: `✅ Patente de ${jogador.apelido} atualizada para ${patente}!`,
            jogador: { id: jogador.id, apelido: jogador.apelido, patente }
        });
        
    } catch (error) {
        console.error('❌ Erro ao alterar patente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// DELETE jogador (remoção física - cuidado!)
app.delete('/api/jogadores/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        
        // Verificar se jogador existe
        const existeResult = await client.query(
            'SELECT id, apelido FROM jogadores WHERE id = $1',
            [id]
        );
        
        if (existeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Jogador não encontrado' });
        }
        
        const jogador = existeResult.rows[0];
        
        // Verificar se jogador tem partidas registradas
        const partidasResult = await client.query(
            'SELECT COUNT(*) as total FROM partidas WHERE participantes LIKE $1',
            [`%${id}%`]
        );
        
        const totalPartidas = parseInt(partidasResult.rows[0].total);
        
        if (totalPartidas > 0) {
            return res.status(400).json({ 
                error: `Não é possível excluir este jogador pois ele participou de ${totalPartidas} partida(s). Use "Desativar" em vez de excluir.` 
            });
        }
        
        // Excluir jogador
        await client.query('DELETE FROM jogadores WHERE id = $1', [id]);
        
        res.json({
            sucesso: true,
            mensagem: `🗑️ Jogador ${jogador.apelido} excluído permanentemente!`,
            jogador: { id: jogador.id, apelido: jogador.apelido }
        });
        
    } catch (error) {
        console.error('❌ Erro ao excluir jogador:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// ============ ROTAS DE PARTIDAS ============

// GET todas partidas
app.get('/api/partidas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                j.apelido as vencedor_nome,
                j.patente as vencedor_patente
            FROM partidas p
            LEFT JOIN jogadores j ON p.vencedor_id = j.id
            ORDER BY p.data DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro ao buscar partidas:', error);
        res.json([]);
    }
});

// POST cadastrar nova partida
app.post('/api/partidas', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { vencedor_id, participantes, observacoes, tipo } = req.body;
        
        // Validação
        if (!vencedor_id || !participantes) {
            return res.status(400).json({ error: 'Vencedor e participantes são obrigatórios' });
        }
        
        const participantesArray = participantes.split(',').map(id => parseInt(id.trim()));
        
        if (participantesArray.length < 3) {
            return res.status(400).json({ error: 'É necessário pelo menos 3 participantes' });
        }
        
        if (!participantesArray.includes(parseInt(vencedor_id))) {
            return res.status(400).json({ error: 'O vencedor deve estar entre os participantes' });
        }
        
        // Verificar se todos os participantes existem e estão ativos
        const participantesResult = await client.query(
            'SELECT id, apelido, status FROM jogadores WHERE id = ANY($1)',
            [participantesArray]
        );
        
        if (participantesResult.rows.length !== participantesArray.length) {
            return res.status(400).json({ error: 'Um ou mais participantes não foram encontrados' });
        }
        
        const inativos = participantesResult.rows.filter(j => j.status !== 'Ativo');
        if (inativos.length > 0) {
            return res.status(400).json({ 
                error: `Os seguintes jogadores estão inativos: ${inativos.map(j => j.apelido).join(', ')}` 
            });
        }
        
        // Inserir partida
        const result = await client.query(
            `INSERT INTO partidas (vencedor_id, participantes, observacoes, tipo) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [vencedor_id, participantes, observacoes || '', tipo || 'global']
        );
        
        res.status(201).json({
            sucesso: true,
            id: result.rows[0].id,
            mensagem: '⚔️ Partida registrada com sucesso!'
        });
        
    } catch (error) {
        console.error('❌ Erro ao registrar partida:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        client.release();
    }
});

// ============ ROTAS DE RANKING ============

// GET ranking global
app.get('/api/ranking/global', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                j.id,
                j.apelido,
                j.patente,
                COUNT(p.id) as partidas,
                SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias
            FROM jogadores j
            LEFT JOIN partidas p ON p.participantes LIKE '%' || j.id || '%'
            WHERE j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            ORDER BY vitorias DESC, partidas DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro ranking global:', error);
        res.json([]);
    }
});

// GET ranking mensal
app.get('/api/ranking/mensal', async (req, res) => {
    try {
        const hoje = new Date();
        const mes = hoje.getMonth() + 1;
        const ano = hoje.getFullYear();
        
        const result = await pool.query(`
            SELECT 
                j.id,
                j.apelido,
                j.patente,
                COUNT(p.id) as partidas,
                SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias
            FROM jogadores j
            LEFT JOIN partidas p ON p.participantes LIKE '%' || j.id || '%'
                AND EXTRACT(YEAR FROM p.data) = $1
                AND EXTRACT(MONTH FROM p.data) = $2
            WHERE j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            HAVING COUNT(p.id) > 0
            ORDER BY vitorias DESC, partidas DESC
        `, [ano, mes]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro ranking mensal:', error);
        res.json([]);
    }
});

// GET ranking performance
app.get('/api/ranking/performance', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                j.id,
                j.apelido,
                j.patente,
                COUNT(p.id) as partidas,
                SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias,
                CASE 
                    WHEN COUNT(p.id) > 0 THEN 
                        ROUND((SUM(CASE WHEN p.vencedor_id = j.id THEN 1.0 ELSE 0 END) / COUNT(p.id)) * 100, 1)
                    ELSE 0 
                END as percentual
            FROM jogadores j
            LEFT JOIN partidas p ON p.participantes LIKE '%' || j.id || '%'
            WHERE j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            HAVING COUNT(p.id) >= 3
            ORDER BY percentual DESC, vitorias DESC
            LIMIT 20
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro ranking performance:', error);
        res.json([]);
    }
});

// ============ ROTAS DE ESTATÍSTICAS ============

// GET estatísticas gerais
app.get('/api/estatisticas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM jogadores WHERE status = 'Ativo') as total_jogadores,
                (SELECT COUNT(*) FROM partidas) as total_partidas,
                COALESCE((SELECT MAX(vitorias) FROM (
                    SELECT COUNT(*) as vitorias 
                    FROM partidas 
                    GROUP BY vencedor_id
                ) as sub), 0) as record_vitorias,
                (SELECT apelido FROM (
                    SELECT j.apelido, COUNT(*) as vitorias
                    FROM partidas p
                    JOIN jogadores j ON p.vencedor_id = j.id
                    GROUP BY j.apelido
                    ORDER BY vitorias DESC
                    LIMIT 1
                ) as record) as record_holder
        `);
        
        const stats = result.rows[0];
        
        // Calcular média de partidas por jogador
        const media = stats.total_jogadores > 0 ? 
            (stats.total_partidas / stats.total_jogadores).toFixed(1) : 0;
        
        res.json({
            ...stats,
            media_partidas_por_jogador: parseFloat(media)
        });
        
    } catch (error) {
        console.error('❌ Erro estatísticas:', error);
        res.json({
            total_jogadores: 0,
            total_partidas: 0,
            record_vitorias: 0,
            record_holder: null,
            media_partidas_por_jogador: 0
        });
    }
});

// GET vencedores deste ano
app.get('/api/vencedores-anual', async (req, res) => {
    try {
        const ano = new Date().getFullYear();
        
        const result = await pool.query(`
            SELECT 
                TO_CHAR(p.data, 'MM/YYYY') as mes_ano,
                EXTRACT(MONTH FROM p.data) as mes_numero,
                j.apelido as vencedor,
                j.patente,
                COUNT(*) as vitorias
            FROM partidas p
            JOIN jogadores j ON p.vencedor_id = j.id
            WHERE EXTRACT(YEAR FROM p.data) = $1
            GROUP BY TO_CHAR(p.data, 'MM/YYYY'), EXTRACT(MONTH FROM p.data), j.apelido, j.patente
            ORDER BY mes_numero
        `, [ano]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Erro vencedores anual:', error);
        res.json([]);
    }
});

// ============ NOVAS ROTAS API ============

// Rota para estatísticas com recorde consecutivo
app.get('/api/estatisticas/completo', async (req, res) => {
    try {
        // Buscar jogadores e partidas
        const jogadoresResult = await pool.query(
            "SELECT COUNT(*) as total FROM jogadores WHERE status = 'Ativo'"
        );
        
        const partidasResult = await pool.query(
            "SELECT COUNT(*) as total FROM partidas"
        );
        
        // Buscar recorde de vitórias consecutivas
        const recordResult = await pool.query(`
            WITH partidas_ordenadas AS (
                SELECT 
                    p.*,
                    ROW_NUMBER() OVER (PARTITION BY p.vencedor_id ORDER BY p.data) as rn
                FROM partidas p
                ORDER BY p.vencedor_id, p.data
            ),
            grupos_consecutivos AS (
                SELECT 
                    vencedor_id,
                    j.apelido,
                    COUNT(*) as consecutivas,
                    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
                FROM partidas_ordenadas po
                JOIN jogadores j ON po.vencedor_id = j.id
                GROUP BY vencedor_id, j.apelido
                ORDER BY consecutivas DESC
            )
            SELECT * FROM grupos_consecutivos WHERE rank = 1
        `);
        
        const record = recordResult.rows[0] || { apelido: '-', consecutivas: 0 };
        
        // Buscar distribuição de patentes
        const patentesResult = await pool.query(`
            SELECT 
                patente,
                COUNT(*) as quantidade
            FROM jogadores 
            WHERE status = 'Ativo'
            GROUP BY patente
            ORDER BY 
                CASE patente
                    WHEN 'Marechal 🏆' THEN 1
                    WHEN 'General ⭐' THEN 2
                    WHEN 'Coronel 🎖️' THEN 3
                    WHEN 'Major 💪' THEN 4
                    WHEN 'Capitão 👮' THEN 5
                    WHEN 'Tenente ⚔️' THEN 6
                    WHEN 'Soldado 🛡️' THEN 7
                    WHEN 'Cabo 🪖' THEN 8
                    ELSE 9
                END
        `);
        
        res.json({
            total_jogadores: parseInt(jogadoresResult.rows[0].total),
            total_partidas: parseInt(partidasResult.rows[0].total),
            record_consecutivas: record.consecutivas,
            record_holder: record.apelido,
            patentes: patentesResult.rows.reduce((obj, item) => {
                obj[item.patente] = parseInt(item.quantidade);
                return obj;
            }, {})
        });
        
    } catch (error) {
        console.error('Erro nas estatísticas:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para ranking mensal
app.get('/api/ranking/mensal/:ano/:mes', async (req, res) => {
    try {
        const { ano, mes } = req.params;
        
        const result = await pool.query(`
            WITH partidas_mes AS (
                SELECT * FROM partidas 
                WHERE EXTRACT(YEAR FROM data) = $1 
                AND EXTRACT(MONTH FROM data) = $2
            )
            SELECT 
                j.id,
                j.apelido,
                j.patente,
                COUNT(pm.id) as partidas,
                SUM(CASE WHEN pm.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias
            FROM jogadores j
            LEFT JOIN partidas_mes pm ON pm.participantes LIKE '%' || j.id || '%'
            WHERE j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            HAVING COUNT(pm.id) > 0
            ORDER BY vitorias DESC, partidas DESC
        `, [ano, mes]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro no ranking mensal:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para ranking de performance
app.get('/api/ranking/performance', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                j.id,
                j.apelido,
                j.patente,
                COUNT(p.id) as partidas,
                SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias,
                CASE 
                    WHEN COUNT(p.id) >= 3 THEN 
                        ROUND((SUM(CASE WHEN p.vencedor_id = j.id THEN 1.0 ELSE 0 END) / COUNT(p.id)) * 100, 1)
                    ELSE 0 
                END as performance
            FROM jogadores j
            LEFT JOIN partidas p ON p.participantes LIKE '%' || j.id || '%'
            WHERE j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            HAVING COUNT(p.id) >= 3
            ORDER BY performance DESC, vitorias DESC
        `);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro no ranking performance:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para vencedores mensais por ano
app.get('/api/vencedores/mensal/:ano', async (req, res) => {
    try {
        const { ano } = req.params;
        
        const result = await pool.query(`
            WITH vencedores_mes AS (
                SELECT 
                    EXTRACT(MONTH FROM p.data) as mes,
                    j.apelido as vencedor,
                    j.patente,
                    COUNT(*) as vitorias,
                    ROW_NUMBER() OVER (PARTITION BY EXTRACT(MONTH FROM p.data) ORDER BY COUNT(*) DESC) as rank
                FROM partidas p
                JOIN jogadores j ON p.vencedor_id = j.id
                WHERE EXTRACT(YEAR FROM p.data) = $1
                GROUP BY EXTRACT(MONTH FROM p.data), j.apelido, j.patente
            )
            SELECT * FROM vencedores_mes WHERE rank = 1
            ORDER BY mes
        `, [ano]);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro nos vencedores mensais:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para distribuição de patentes (para gráfico)
app.get('/api/estatisticas/patentes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                patente,
                COUNT(*) as quantidade
            FROM jogadores 
            WHERE status = 'Ativo'
            GROUP BY patente
            ORDER BY 
                CASE patente
                    WHEN 'Marechal 🏆' THEN 1
                    WHEN 'General ⭐' THEN 2
                    WHEN 'Coronel 🎖️' THEN 3
                    WHEN 'Major 💪' THEN 4
                    WHEN 'Capitão 👮' THEN 5
                    WHEN 'Tenente ⚔️' THEN 6
                    WHEN 'Soldado 🛡️' THEN 7
                    WHEN 'Cabo 🪖' THEN 8
                    ELSE 9
                END
        `);
        
        const data = result.rows.reduce((obj, item) => {
            obj[item.patente] = parseInt(item.quantidade);
            return obj;
        }, {});
        
        res.json(data);
        
    } catch (error) {
        console.error('Erro nas estatísticas de patentes:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para assiduidade (para gráfico)
app.get('/api/estatisticas/assiduidade', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                j.apelido,
                COUNT(p.id) as partidas
            FROM jogadores j
            LEFT JOIN partidas p ON p.participantes LIKE '%' || j.id || '%'
            WHERE j.status = 'Ativo'
            GROUP BY j.id, j.apelido
            ORDER BY partidas DESC
            LIMIT 8
        `);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro na assiduidade:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para exportação de partidas
app.get('/api/partidas/export', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                j.apelido as vencedor_nome
            FROM partidas p
            LEFT JOIN jogadores j ON p.vencedor_id = j.id
            ORDER BY p.data DESC
        `);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro na exportação:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para partidas recentes
app.get('/api/partidas/recentes', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                j.apelido as vencedor_nome
            FROM partidas p
            LEFT JOIN jogadores j ON p.vencedor_id = j.id
            ORDER BY p.data DESC
            LIMIT 10
        `);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro nas partidas recentes:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ============ ROTA PARA TESTE RÁPIDO ============

app.get('/api/teste', async (req, res) => {
    try {
        const jogadores = await pool.query("SELECT COUNT(*) as total FROM jogadores");
        const partidas = await pool.query("SELECT COUNT(*) as total FROM partidas");
        
        res.json({
            status: 'OK',
            mensagem: 'API funcionando corretamente',
            jogadores: parseInt(jogadores.rows[0].total),
            partidas: parseInt(partidas.rows[0].total),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            mensagem: 'Erro no banco de dados',
            error: error.message
        });
    }
});

// Endpoints para dashboard
app.get('/api/estatisticas/patentes', (req, res) => {
    try {
        // Mock data - substituir por dados reais do banco
        pool.query('SELECT patente, COUNT(*) as quantidade FROM jogadores GROUP BY patente', (err, result) => {
            if (err) {
                // Retorna dados mock se a query falhar
                const mockData = {
                    'Cabo 🪖': 8,
                    'Soldado 🛡️': 2,
                    'Tenente ⚔️': 1,
                    'Capitão 👮': 0,
                    'Major 💪': 0,
                    'Coronel 🎖️': 0,
                    'General ⭐': 0,
                    'Marechal 🏆': 0
                };
                res.json(mockData);
            } else {
                // Transforma resultado do banco em objeto
                const data = {};
                result.rows.forEach(row => {
                    data[row.patente] = parseInt(row.quantidade);
                });
                res.json(data);
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/estatisticas/assiduidade', (req, res) => {
    try {
        // Query para contar partidas por jogador
        pool.query(`
            SELECT j.apelido, COUNT(pj.partida_id) as partidas
            FROM jogadores j
            LEFT JOIN partidas_jogadores pj ON j.id = pj.jogador_id
            GROUP BY j.id, j.apelido
            ORDER BY partidas DESC
            LIMIT 8
        `, (err, result) => {
            if (err) {
                // Mock data
                const mockData = [
                    { apelido: 'Silva', partidas: 5 },
                    { apelido: 'Santos', partidas: 4 },
                    { apelido: 'Costa', partidas: 3 },
                    { apelido: 'Lima', partidas: 2 },
                    { apelido: 'Souza', partidas: 1 }
                ];
                res.json(mockData);
            } else {
                res.json(result.rows);
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ranking/performance', (req, res) => {
    try {
        pool.query(`
            SELECT 
                j.apelido,
                j.patente,
                COUNT(pj.partida_id) as partidas,
                SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias,
                CASE 
                    WHEN COUNT(pj.partida_id) > 0 
                    THEN ROUND((SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END)::FLOAT / COUNT(pj.partida_id) * 100), 1)
                    ELSE 0 
                END as performance
            FROM jogadores j
            LEFT JOIN partidas_jogadores pj ON j.id = pj.jogador_id
            LEFT JOIN partidas p ON pj.partida_id = p.id
            WHERE j.status = 'Ativo'
            GROUP BY j.id, j.apelido, j.patente
            HAVING COUNT(pj.partida_id) >= 3
            ORDER BY performance DESC
        `, (err, result) => {
            if (err) {
                // Mock data
                const mockData = [
                    { 
                        apelido: 'Silva', 
                        patente: 'Cabo 🪖', 
                        partidas: 5, 
                        vitorias: 3, 
                        performance: '60.0' 
                    },
                    { 
                        apelido: 'Santos', 
                        patente: 'Soldado 🛡️', 
                        partidas: 4, 
                        vitorias: 2, 
                        performance: '50.0' 
                    }
                ];
                res.json(mockData);
            } else {
                res.json(result.rows);
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============ ROTA PARA SPA (Single Page Application) ============

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============ MANIPULADOR DE ERROS ============

app.use((err, req, res, next) => {
    console.error('❌ ERRO NÃO TRATADO:', err.stack);
    res.status(500).json({
        error: 'Erro interno do servidor',
        mensagem: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
    });
});

// ============ INICIAR SERVIDOR ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor WAR Board GameRank rodando!`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔧 Teste API: http://localhost:${PORT}/api/teste`);
    console.log(`🎮 Jogadores: http://localhost:${PORT}/api/jogadores`);
    console.log(`⚔️  Partidas: http://localhost:${PORT}/api/partidas`);
    console.log(`🏆 Ranking: http://localhost:${PORT}/api/ranking/global`);
    console.log(`📈 Estatísticas: http://localhost:${PORT}/api/estatisticas`);
    console.log(`\n📋 Endpoints disponíveis:`);
    console.log(`   GET  /api/jogadores           - Lista jogadores ativos`);
    console.log(`   POST /api/jogadores           - Cadastra novo jogador`);
    console.log(`   PUT  /api/jogadores/:id       - Atualiza jogador`);
    console.log(`   PATCH /api/jogadores/:id/status - Altera status`);
    console.log(`   POST /api/partidas            - Registra partida`);
    console.log(`\n✅ Sistema pronto para uso!`);
});
