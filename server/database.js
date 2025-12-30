const { Pool } = require('pg');

class WARDatabase {
    constructor() {
        console.log('🔧 Inicializando conexão com PostgreSQL Neon...');
        
        // URL DIRETA DO SEU BANCO (que você testou com psql)
        const databaseUrl = 'postgresql://neondb_owner:npg_nx8c1PJMGEOh@ep-late-lake-ae95e4tj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
        
        console.log('📊 Conectando ao PostgreSQL...');
        
        this.pool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            },
            max: 5,
            idleTimeoutMillis: 30000,
        });
        
        // Inicializar banco
        this.initDatabase();
    }

    async initDatabase() {
        try {
            console.log('🔄 Verificando/Criando tabelas...');
            
            // Tabela jogadores
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS jogadores (
                    id SERIAL PRIMARY KEY,
                    nome TEXT NOT NULL,
                    apelido TEXT UNIQUE NOT NULL,
                    email TEXT,
                    patente TEXT DEFAULT 'Cabo 🪖',
                    status TEXT DEFAULT 'Ativo',
                    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Tabela partidas
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS partidas (
                    id SERIAL PRIMARY KEY,
                    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tipo TEXT DEFAULT 'global',
                    vencedor_id INTEGER,
                    participantes TEXT,
                    observacoes TEXT
                )
            `);
            
            console.log('✅ Tabelas prontas');
            
            // Verificar se tem dados
            await this.verificarDados();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar:', error.message);
        }
    }

    async verificarDados() {
        try {
            const result = await this.pool.query('SELECT COUNT(*) FROM jogadores');
            if (parseInt(result.rows[0].count) === 0) {
                console.log('📝 Inserindo dados iniciais...');
                await this.inserirDadosIniciais();
            }
        } catch (error) {
            console.error('❌ Erro ao verificar dados:', error.message);
        }
    }

    async inserirDadosIniciais() {
        try {
            await this.pool.query(`
                INSERT INTO jogadores (nome, apelido, email, patente) VALUES
                ('Comandante Silva', 'Silva', 'silva@email.com', 'General ⭐'),
                ('Capitão Santos', 'Santos', 'santos@email.com', 'Capitão 👮'),
                ('Tenente Costa', 'Costa', 'costa@email.com', 'Tenente ⚔️'),
                ('Soldado Lima', 'Lima', 'lima@email.com', 'Soldado 🛡️'),
                ('Recruta Souza', 'Souza', 'souza@email.com', 'Cabo 🪖')
                ON CONFLICT (apelido) DO NOTHING
            `);
            console.log('✅ Dados iniciais inseridos');
        } catch (error) {
            console.error('❌ Erro ao inserir dados:', error.message);
        }
    }

    // ============ MÉTODOS ============
    
    async getJogadores() {
        try {
            const result = await this.pool.query(
                "SELECT * FROM jogadores WHERE status = 'Ativo' ORDER BY apelido"
            );
            return result.rows;
        } catch (error) {
            console.error('Erro getJogadores:', error.message);
            return [];
        }
    }

async addJogador(jogador) {
    try {
        const result = await this.pool.query(
            `INSERT INTO jogadores (nome, apelido, email, patente, observacoes) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, patente, apelido`,
            [
                jogador.nome,
                jogador.apelido,
                jogador.email || null,
                'Cabo 🪖',  // ← PATENTE FIXA SEMPRE
                jogador.observacoes || ''
            ]
        );
        
        console.log(`✅ Jogador cadastrado: ${result.rows[0].apelido} (Patente: Cabo 🪖)`);
        
        return {
            sucesso: true,
            id: result.rows[0].id,
            patente: 'Cabo 🪖',  // ← SEMPRE RETORNA CABO
            apelido: result.rows[0].apelido
        };
    } catch (error) {
        console.error('Erro ao cadastrar jogador:', error.message);
        
        if (error.message.includes('unique constraint') || error.code === '23505') {
            throw new Error(`Apelido "${jogador.apelido}" já está em uso!`);
        }
        throw error;
    }
}

    async getPartidas() {
        try {
            const result = await this.pool.query(`
                SELECT p.*, j.apelido as vencedor_nome 
                FROM partidas p 
                LEFT JOIN jogadores j ON p.vencedor_id = j.id 
                ORDER BY p.data DESC 
                LIMIT 50
            `);
            return result.rows;
        } catch (error) {
            console.error('Erro getPartidas:', error.message);
            return [];
        }
    }

async addPartida(partida) {
    try {
        // VALIDAÇÃO: Mínimo de 3 participantes
        const participantes = partida.participantes.split(',').map(id => parseInt(id.trim()));
        
        if (participantes.length < 3) {
            throw new Error('É necessário pelo menos 3 participantes');
        }
        
        if (!participantes.includes(partida.vencedor_id)) {
            throw new Error('O vencedor deve estar entre os participantes');
        }
        
        // Verificar se todos os participantes existem no banco
        const placeholders = participantes.map((_, i) => `$${i + 1}`).join(',');
        const jogadoresResult = await this.pool.query(
            `SELECT COUNT(*) as count FROM jogadores WHERE id IN (${placeholders})`,
            participantes
        );
        
        if (parseInt(jogadoresResult.rows[0].count) !== participantes.length) {
            throw new Error('Um ou mais participantes não existem no sistema');
        }
        
        const result = await this.pool.query(
            `INSERT INTO partidas (vencedor_id, participantes, observacoes, tipo) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id`,
            [
                partida.vencedor_id,
                partida.participantes,
                partida.observacoes || '',
                partida.tipo || 'global'
            ]
        );
        
        console.log(`✅ Partida registrada: ID=${result.rows[0].id} (${participantes.length} participantes)`);
        
        return { 
            sucesso: true, 
            id: result.rows[0].id 
        };
    } catch (error) {
        console.error('Erro ao registrar partida:', error.message);
        throw error;
    }
}

    
    //async addPartida(partida) {
   //     try {
  //          const result = await this.pool.query(
  //              `INSERT INTO partidas (vencedor_id, participantes, observacoes, tipo) 
  //               VALUES ($1, $2, $3, $4) 
  //               RETURNING id`,
  //              [
  //                  partida.vencedor_id,
  //                  partida.participantes,
  //                  partida.observacoes || '',
  //                  partida.tipo || 'global'
  //              ]
  //          );
  //          
 //           return { sucesso: true, id: result.rows[0].id };
  //      } catch (error) {
  //          console.error('Erro addPartida:', error.message);
  //          throw error;
  //      }
 //   }

    async getRankingGlobal() {
        try {
            const result = await this.pool.query(`
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
            return result.rows;
        } catch (error) {
            console.error('Erro getRankingGlobal:', error.message);
            return [];
        }
    }

    async getEstatisticas() {
        try {
            const result = await this.pool.query(`
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
            return result.rows[0];
        } catch (error) {
            console.error('Erro getEstatisticas:', error.message);
            return { total_jogadores: 0, total_partidas: 0, record_vitorias: 0 };
        }
    }
}

// Singleton
let dbInstance = null;

function getDatabase() {
    if (!dbInstance) {
        dbInstance = new WARDatabase();
    }
    return dbInstance;
}

module.exports = { getDatabase };


