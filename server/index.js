const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// No início do arquivo, após os requires:
const DatabaseBackup = require('./backup');
const backupSystem = new DatabaseBackup();

// Agendar backup automático (toda segunda-feira às 2:00)
const schedule = require('node-schedule');
schedule.scheduleJob('0 2 * * 1', () => { // Toda segunda às 2:00
    console.log('🔄 Backup automático agendado...');
    backupSystem.createBackup();
});

// ============ ROTAS DE BACKUP ============

// Backup manual (protegido por senha simples)
app.post('/api/admin/backup', async (req, res) => {
    const { password } = req.body;
    
    // Senha simples para proteção (altere para uma senha forte)
    if (password !== 'war123') {
        return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    const result = await backupSystem.createBackup();
    
    if (result.success) {
        res.json({
            success: true,
            message: 'Backup criado e enviado por email',
            file: result.file
        });
    } else {
        res.status(500).json({
            success: false,
            error: result.error
        });
    }
});

// Listar backups
app.get('/api/admin/backups', (req, res) => {
    const backups = backupSystem.listBackups();
    res.json(backups);
});

// Download backup
app.get('/api/admin/backup/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'backups', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).json({ error: 'Backup não encontrado' });
    }
});

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// ============ CONEXÃO DIRETA COM SEU POSTGRESQL ============
console.log('🔗 Conectando ao PostgreSQL do Render...');

// SUA URL DO BANCO - COLE AQUI SUA URL COMPLETA
const DATABASE_URL = 'postgresql://wardb_user:pRNwj9TZ3F4Dbk2fdT0vdgTkdsYG17LB@dpg-d5a44u6mcj7s73c5q070-a/war_database_1k0z';

let pool;

try {
  console.log('📊 Configurando conexão PostgreSQL...');
  
  // Configuração EXATA para seu banco
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // OBRIGATÓRIO para Render
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  
  console.log('✅ Pool PostgreSQL configurado');
  
  // Testar conexão IMEDIATAMENTE
  testarConexao();
  
} catch (error) {
  console.error('❌ Erro fatal ao configurar PostgreSQL:', error.message);
  process.exit(1);
}

// Função para testar conexão
async function testarConexao() {
  let client;
  try {
    console.log('🔍 Testando conexão com o banco...');
    client = await pool.connect();
    
    // Teste 1: Conexão básica
    const result1 = await client.query('SELECT NOW() as hora_servidor');
    console.log('✅ PostgreSQL conectado! Hora do servidor:', result1.rows[0].hora_servidor);
    
    // Teste 2: Ver versão
    const result2 = await client.query('SELECT version()');
    console.log('📋 PostgreSQL:', result2.rows[0].version.split(',')[0]);
    
    // Teste 3: Ver database
    const result3 = await client.query('SELECT current_database() as db');
    console.log('🗄️  Database:', result3.rows[0].db);
    
    client.release();
    
    // Criar tabelas
    await criarTabelas();
    
  } catch (error) {
    console.error('❌ FALHA NA CONEXÃO:', error.message);
    console.error('📋 Detalhes do erro:', error);
    
    if (client) client.release();
    
    // Tentar reconectar em 5 segundos
    console.log('🔄 Tentando reconectar em 5 segundos...');
    setTimeout(testarConexao, 5000);
  }
}

// Criar tabelas se não existirem
async function criarTabelas() {
  console.log('🔄 Verificando/Criando tabelas...');
  
  const client = await pool.connect();
  
  try {
    // 1. Tabela jogadores
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
    
    // 2. Tabela partidas
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
    
    // Verificar se já tem jogadores
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
      console.log(`📊 Banco já tem ${totalJogadores} jogadores`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
  } finally {
    client.release();
  }
}

// ============ ROTAS DA API ============

// Health check com status do banco
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    client.release();
    
    res.json({ 
      status: 'online',
      service: 'WAR Board GameRank',
      database: 'PostgreSQL ✅ CONECTADO',
      jogadores: await contarJogadores(),
      partidas: await contarPartidas(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      status: 'online',
      service: 'WAR Board GameRank',
      database: 'PostgreSQL ❌ DESCONECTADO',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Funções auxiliares
async function contarJogadores() {
  try {
    const result = await pool.query("SELECT COUNT(*) as total FROM jogadores WHERE status = 'Ativo'");
    return parseInt(result.rows[0].total);
  } catch {
    return 0;
  }
}

async function contarPartidas() {
  try {
    const result = await pool.query("SELECT COUNT(*) as total FROM partidas");
    return parseInt(result.rows[0].total);
  } catch {
    return 0;
  }
}

// GET todos jogadores
app.get('/api/jogadores', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM jogadores WHERE status = 'Ativo' ORDER BY apelido"
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar jogadores:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST cadastrar jogador
app.post('/api/jogadores', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { nome, apelido, email, observacoes } = req.body;
    
    if (!nome || !apelido) {
      return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
    }
    
    const result = await client.query(
      `INSERT INTO jogadores (nome, apelido, email, observacoes) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, patente`,
      [nome.trim(), apelido.trim(), email?.trim() || null, observacoes?.trim() || '']
    );
    
    res.json({
      sucesso: true,
      id: result.rows[0].id,
      patente: result.rows[0].patente,
      mensagem: `🎖️ Jogador ${apelido} cadastrado com sucesso!`
    });
    
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    
    if (error.code === '23505') { // Violação de unicidade
      res.status(400).json({ error: 'Apelido já está em uso' });
    } else {
      res.status(500).json({ error: 'Erro interno' });
    }
  } finally {
    client.release();
  }
});

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
    console.error('Erro ao buscar partidas:', error);
    res.json([]);
  }
});

// POST cadastrar partida
app.post('/api/partidas', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { vencedor_id, participantes, observacoes, tipo } = req.body;
    
    // Validações
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
    
    const result = await client.query(
      `INSERT INTO partidas (vencedor_id, participantes, observacoes, tipo) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [vencedor_id, participantes, observacoes || '', tipo || 'global']
    );
    
    res.json({
      sucesso: true,
      id: result.rows[0].id,
      mensagem: '⚔️ Partida registrada com sucesso!'
    });
    
  } catch (error) {
    console.error('Erro ao registrar partida:', error);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

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
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao calcular ranking:', error);
    res.json([]);
  }
});

// Ranking mensal
app.get('/api/ranking/mensal/:mes', async (req, res) => {
  const { mes } = req.params; // formato: "MM/YYYY"
  // Lógica para filtrar por mês
});

// Ranking por performance
app.get('/api/ranking/performance', async (req, res) => {
  // Ranking baseado em porcentagem de vitórias
});

// ============ RANKINGS AVANÇADOS ============

// Ranking Global (já existe)
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
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ranking global:', error);
        res.json([]);
    }
});

// Ranking Mensal
app.get('/api/ranking/mensal/:ano/:mes', async (req, res) => {
    try {
        const { ano, mes } = req.params;
        const mesFormatado = mes.padStart(2, '0');
        
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
        `, [ano, mesFormatado]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ranking mensal:', error);
        res.json([]);
    }
});

// Ranking de Performance (% de vitórias)
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
                        ROUND((SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END)::DECIMAL / COUNT(p.id)) * 100, 1)
                    ELSE 0 
                END as percentual
            FROM jogadores j
            LEFT JOIN partidas p ON p.participantes LIKE '%' || j.id || '%'
            WHERE j.status = 'Ativo' AND COUNT(p.id) > 0
            GROUP BY j.id, j.apelido, j.patente
            HAVING COUNT(p.id) >= 3  -- Mínimo 3 partidas para ter performance
            ORDER BY percentual DESC, vitorias DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ranking performance:', error);
        res.json([]);
    }
});

// Vencedores mensais por ano
app.get('/api/vencedores-mensais/:ano', async (req, res) => {
    try {
        const { ano } = req.params;
        
        const result = await pool.query(`
            SELECT 
                EXTRACT(MONTH FROM p.data) as mes,
                j.apelido as vencedor,
                j.patente,
                COUNT(*) as vitorias
            FROM partidas p
            JOIN jogadores j ON p.vencedor_id = j.id
            WHERE EXTRACT(YEAR FROM p.data) = $1
            GROUP BY EXTRACT(MONTH FROM p.data), j.apelido, j.patente
            ORDER BY mes
        `, [ano]);
        
        // Organizar por mês
        const vencedoresPorMes = {};
        for (let i = 1; i <= 12; i++) {
            vencedoresPorMes[i] = null;
        }
        
        result.rows.forEach(row => {
            vencedoresPorMes[parseInt(row.mes)] = {
                vencedor: row.vencedor,
                patente: row.patente,
                vitorias: parseInt(row.vitorias)
            };
        });
        
        res.json(vencedoresPorMes);
    } catch (error) {
        console.error('Erro vencedores mensais:', error);
        res.json({});
    }
});

// Função para registrar vencedor do mês automaticamente
async function registrarVencedorMensal() {
    try {
        const hoje = new Date();
        const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const ano = mesPassado.getFullYear();
        const mes = mesPassado.getMonth() + 1;
        
        console.log(`🏆 Calculando vencedor do mês: ${mes}/${ano}`);
        
        // Buscar ranking do mês passado
        const result = await pool.query(`
            SELECT 
                j.id,
                j.apelido,
                COUNT(*) as vitorias
            FROM partidas p
            JOIN jogadores j ON p.vencedor_id = j.id
            WHERE EXTRACT(YEAR FROM p.data) = $1
                AND EXTRACT(MONTH FROM p.data) = $2
            GROUP BY j.id, j.apelido
            ORDER BY vitorias DESC
            LIMIT 1
        `, [ano, mes]);
        
        if (result.rows.length > 0) {
            const vencedor = result.rows[0];
            
            // Registrar na tabela de vencedores mensais
            await pool.query(`
                INSERT INTO vencedores_mensais (ano, mes, jogador_id, vitorias)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (ano, mes) DO UPDATE 
                SET jogador_id = $3, vitorias = $4, atualizado_em = CURRENT_TIMESTAMP
            `, [ano, mes, vencedor.id, vencedor.vitorias]);
            
            console.log(`✅ Vencedor do mês ${mes}/${ano}: ${vencedor.apelido} (${vencedor.vitorias} vitórias)`);
            
            // Atualizar patente do vencedor
            await atualizarPatente(vencedor.id);
        }
        
    } catch (error) {
        console.error('Erro ao registrar vencedor mensal:', error);
    }
}

// Agendar para dia 1 de cada mês às 00:05
schedule.scheduleJob('5 0 1 * *', () => {
    console.log('🔄 Executando cálculo de vencedor mensal...');
    registrarVencedorMensal();
});

// Criar tabela para vencedores mensais
async function criarTabelaVencedoresMensais() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vencedores_mensais (
                id SERIAL PRIMARY KEY,
                ano INTEGER NOT NULL,
                mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
                jogador_id INTEGER REFERENCES jogadores(id),
                vitorias INTEGER DEFAULT 0,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(ano, mes)
            )
        `);
        console.log('✅ Tabela vencedores_mensais criada');
    } catch (error) {
        console.error('Erro ao criar tabela vencedores:', error);
    }
}

// Atualizar patente baseado em vitórias
async function atualizarPatente(jogadorId) {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as total_vitorias
            FROM partidas
            WHERE vencedor_id = $1
        `, [jogadorId]);
        
        const vitorias = parseInt(result.rows[0].total_vitorias);
        let novaPatente = 'Cabo 🪖';
        
        if (vitorias >= 50) novaPatente = 'Marechal 🏆';
        else if (vitorias >= 30) novaPatente = 'General ⭐';
        else if (vitorias >= 20) novaPatente = 'Coronel 🎖️';
        else if (vitorias >= 15) novaPatente = 'Major 💪';
        else if (vitorias >= 10) novaPatente = 'Capitão 👮';
        else if (vitorias >= 5) novaPatente = 'Tenente ⚔️';
        else if (vitorias >= 3) novaPatente = 'Soldado 🛡️';
        
        await pool.query(
            'UPDATE jogadores SET patente = $1 WHERE id = $2',
            [novaPatente, jogadorId]
        );
        
        console.log(`⭐ Jogador ${jogadorId} promovido para: ${novaPatente}`);
        
    } catch (error) {
        console.error('Erro ao atualizar patente:', error);
    }
}

// GET estatísticas
app.get('/api/estatisticas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM jogadores WHERE status = 'Ativo') as total_jogadores,
        (SELECT COUNT(*) FROM partidas) as total_partidas,
        COALESCE((
          SELECT MAX(vitorias) FROM (
            SELECT COUNT(*) as vitorias 
            FROM partidas 
            GROUP BY vencedor_id
          ) as sub
        ), 0) as record_vitorias
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.json({
      total_jogadores: 0,
      total_partidas: 0,
      record_vitorias: 0
    });
  }
});

// Rota para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`🗄️  Conectando ao: ${DATABASE_URL.split('@')[1]}`);
});
