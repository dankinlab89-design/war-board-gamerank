const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Erro ao conectar ao banco:', err);
      } else {
        console.log('✅ Banco de dados conectado');
        this.initDatabase();
      }
    });
  }

  initDatabase() {
    // Tabela de Jogadores
    this.db.run(`
      CREATE TABLE IF NOT EXISTS jogadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        apelido TEXT UNIQUE NOT NULL,
        email TEXT,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
        patente TEXT DEFAULT 'Cabo 🪖',
        status TEXT DEFAULT 'Ativo',
        observacoes TEXT
      )
    `);

    // Tabela de Partidas
    this.db.run(`
      CREATE TABLE IF NOT EXISTS partidas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data DATETIME NOT NULL,
        tipo TEXT DEFAULT 'global',
        campeonato TEXT,
        vencedor_id INTEGER NOT NULL,
        participantes TEXT NOT NULL,
        jogo TEXT DEFAULT 'WAR',
        observacoes TEXT,
        FOREIGN KEY (vencedor_id) REFERENCES jogadores (id)
      )
    `);

    // Tabela de Ranking Mensal
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ranking_mensal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mes_ano TEXT NOT NULL,
        jogador_id INTEGER NOT NULL,
        partidas INTEGER DEFAULT 0,
        vitorias INTEGER DEFAULT 0,
        FOREIGN KEY (jogador_id) REFERENCES jogadores (id),
        UNIQUE(mes_ano, jogador_id)
      )
    `);

    // Tabela de Vencedores Mensais
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vencedores_mensais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mes_ano TEXT UNIQUE NOT NULL,
        jogador_id INTEGER NOT NULL,
        vitorias INTEGER DEFAULT 0,
        FOREIGN KEY (jogador_id) REFERENCES jogadores (id)
      )
    `);

    // Inserir dados de exemplo
    this.insertSampleData();
  }

  insertSampleData() {
    // Verificar se já existem jogadores
    this.db.get("SELECT COUNT(*) as count FROM jogadores", (err, row) => {
      if (row.count === 0) {
        const jogadores = [
          ['Comandante Silva', 'Silva', 'silva@email.com', 'General ⭐'],
          ['Capitão Santos', 'Santos', 'santos@email.com', 'Capitão 👮'],
          ['Tenente Costa', 'Costa', 'costa@email.com', 'Tenente ⚔️'],
          ['Soldado Lima', 'Lima', 'lima@email.com', 'Soldado 🛡️'],
          ['Recruta Souza', 'Souza', 'souza@email.com', 'Cabo 🪖']
        ];

        const stmt = this.db.prepare(`
          INSERT INTO jogadores (nome, apelido, email, patente)
          VALUES (?, ?, ?, ?)
        `);

        jogadores.forEach(jogador => {
          stmt.run(jogador);
        });

        stmt.finalize();
        console.log('📊 Dados de exemplo inseridos');
      }
    });
  }

  // Métodos para Jogadores
  getJogadores(callback) {
    this.db.all("SELECT * FROM jogadores WHERE status = 'Ativo' ORDER BY apelido", callback);
  }

  addJogador(jogador, callback) {
    const { nome, apelido, email } = jogador;
    this.db.run(
      "INSERT INTO jogadores (nome, apelido, email) VALUES (?, ?, ?)",
      [nome, apelido, email],
      callback
    );
  }

  // Métodos para Partidas
  getPartidas(callback) {
    this.db.all(`
      SELECT p.*, j.apelido as vencedor_nome 
      FROM partidas p
      JOIN jogadores j ON p.vencedor_id = j.id
      ORDER BY p.data DESC
    `, callback);
  }

  addPartida(partida, callback) {
    const { data, tipo, campeonato, vencedor_id, participantes, observacoes } = partida;
    this.db.run(
      `INSERT INTO partidas (data, tipo, campeonato, vencedor_id, participantes, observacoes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data, tipo, campeonato, vencedor_id, participantes, observacoes],
      callback
    );
  }

  // Métodos para Rankings
  getRankingGlobal(callback) {
    this.db.all(`
      SELECT 
        j.id,
        j.apelido,
        j.patente,
        COUNT(DISTINCT p.id) as partidas,
        SUM(CASE WHEN p.vencedor_id = j.id THEN 1 ELSE 0 END) as vitorias
      FROM jogadores j
      LEFT JOIN partidas p ON p.participantes LIKE '%' || j.id || '%'
      WHERE j.status = 'Ativo'
      GROUP BY j.id
      ORDER BY vitorias DESC, partidas DESC
    `, callback);
  }

  getRankingMensal(mesAno, callback) {
    this.db.all(`
      SELECT 
        j.id,
        j.apelido,
        j.patente,
        rm.partidas,
        rm.vitorias
      FROM ranking_mensal rm
      JOIN jogadores j ON rm.jogador_id = j.id
      WHERE rm.mes_ano = ?
      ORDER BY rm.vitorias DESC
    `, [mesAno], callback);
  }

  getVencedoresMensais(ano, callback) {
    this.db.all(`
      SELECT 
        vm.mes_ano,
        j.apelido as vencedor,
        vm.vitorias,
        j.patente
      FROM vencedores_mensais vm
      JOIN jogadores j ON vm.jogador_id = j.id
      WHERE vm.mes_ano LIKE ? || '%'
      ORDER BY vm.mes_ano DESC
    `, [ano], callback);
  }

  // Estatísticas gerais
  getEstatisticasGerais(callback) {
    this.db.get(`
      SELECT 
        COUNT(DISTINCT j.id) as total_jogadores,
        COUNT(DISTINCT p.id) as total_partidas,
        MAX(vitorias) as record_vitorias
      FROM jogadores j
      LEFT JOIN (
        SELECT vencedor_id, COUNT(*) as vitorias
        FROM partidas
        GROUP BY vencedor_id
      ) p ON j.id = p.vencedor_id
    `, callback);
  }
}

module.exports = new Database();