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
