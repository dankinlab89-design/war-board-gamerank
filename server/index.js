const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg'); // Adicionar PostgreSQL

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// ============ CONEXÃO COM POSTGRESQL ============
console.log('🔗 Conectando ao PostgreSQL...');

// Configuração do banco para Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para Render
  }
});

// Testar conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar no PostgreSQL:', err.message);
    console.log('📝 Usando modo desenvolvimento (dados em memória)');
  } else {
    console.log('✅ PostgreSQL conectado com sucesso!');
    release();
    criarTabelas();
  }
});

// Criar tabelas se não existirem
async function criarTabelas() {
  try {
    await pool.query(`
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
    
    await pool.query(`
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
    
    // Inserir dados padrão se tabela estiver vazia
    const result = await pool.query('SELECT COUNT(*) FROM jogadores');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO jogadores (nome, apelido, email, patente) VALUES
        ('Comandante Silva', 'Silva', 'silva@email.com', 'General ⭐'),
        ('Capitão Santos', 'Santos', 'santos@email.com', 'Capitão 👮'),
        ('Tenente Costa', 'Costa', 'costa@email.com', 'Tenente ⚔️')
      `);
      console.log('✅ Dados iniciais inseridos');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
  }
}

// ============ ROTAS DA API ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    service: 'WAR Board GameRank',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// GET todos jogadores
app.get('/api/jogadores', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM jogadores WHERE status = 'Ativo' ORDER BY apelido"
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar jogadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST cadastrar jogador
app.post('/api/jogadores', async (req, res) => {
  try {
    const { nome, apelido, email, observacoes } = req.body;
    
    if (!nome || !apelido) {
      return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
    }
    
    const result = await pool.query(
      `INSERT INTO jogadores (nome, apelido, email, observacoes) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, patente`,
      [nome.trim(), apelido.trim(), email?.trim() || null, observacoes?.trim() || '']
    );
    
    res.json({
      sucesso: true,
      id: result.rows[0].id,
      patente: result.rows[0].patente,
      mensagem: `Jogador ${apelido} cadastrado com sucesso!`
    });
    
  } catch (error) {
    console.error('Erro ao cadastrar jogador:', error);
    
    // Se for erro de apelido duplicado
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Apelido já está em uso' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
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
    res.json([]); // Retorna array vazio em caso de erro
  }
});

// POST cadastrar partida
app.post('/api/partidas', async (req, res) => {
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
    
    const result = await pool.query(
      `INSERT INTO partidas (vencedor_id, participantes, observacoes, tipo) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [vencedor_id, participantes, observacoes || '', tipo || 'global']
    );
    
    res.json({
      sucesso: true,
      id: result.rows[0].id,
      mensagem: 'Partida registrada com sucesso!'
    });
    
  } catch (error) {
    console.error('Erro ao registrar partida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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
  console.log(`🗄️  Banco: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Memória'}`);
});
