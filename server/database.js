const { Pool } = require('pg');

class WARDatabase {
    constructor() {
        console.log('🔧 Inicializando conexão com PostgreSQL...');
        
        // URL do Render (ou variável de ambiente)
        const databaseUrl = process.env.DATABASE_URL || 
            process.env.POSTGRES_URL ||
            'postgresql://localhost/wardb';
        
        console.log('📊 Configurando banco de dados...');
        
        this.pool = new Pool({
            connectionString: databaseUrl,
            ssl: databaseUrl.includes('render.com') ? {
                rejectUnauthorized: false
            } : false,
            max: 10,
            idleTimeoutMillis: 30000,
        });
        
        // Inicializar banco
        this.initDatabase();
    }

    async initDatabase() {
        try {
            console.log('🔄 Configurando tabelas...');
            
            // Tabela de Jogadores
            await this.pool.query(`
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
            
            // Tabela de Partidas
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS partidas (
                    id SERIAL PRIMARY KEY,
                    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tipo VARCHAR(20) DEFAULT 'global',
                    vencedor_id INTEGER REFERENCES jogadores(id),
                    participantes TEXT NOT NULL,
                    observacoes TEXT,
                    CHECK (array_length(string_to_array(participantes, ','), 1) >= 3)
                )
            `);
            
            // Índices
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_partidas_data ON partidas(data DESC)
            `);
            
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_partidas_vencedor ON partidas(vencedor_id)
            `);
            
            console.log('✅ Banco configurado com sucesso');
            
            // Verificar dados iniciais
            await this.verificarDadosIniciais();
            
        } catch (error) {
            console.error('❌ Erro ao configurar banco:', error.message);
        }
    }

    async verificarDadosIniciais() {
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
            // Jogadores iniciais
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
                `INSERT INTO jogadores (nome, apelido, email, observacoes) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, patente`,
                [
                    jogador.nome,
                    jogador.apelido,
                    jogador.email || null,
                    jogador.observacoes || ''
                ]
            );
            
            return {
                sucesso: true,
                id: result.rows[0].id,
                patente: 'Cabo 🪖'  // Sempre Cabo
            };
        } catch (error) {
            console.error('Erro addJogador:', error.message);
            throw error;
        }
    }

    async getPartidas() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    p.*,
                    j.apelido as vencedor_nome,
                    j.patente as vencedor_patente
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
            // Validar mínimo de 3 participantes
            const participantes = partida.participantes.split(',').map(id => parseInt(id.trim()));
            
            if (participantes.length < 3) {
                throw new Error('É necessário pelo menos 3 participantes');
            }
            
            if (!participantes.includes(partida.vencedor_id)) {
                throw new Error('O vencedor deve estar entre os participantes');
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
            
            return { sucesso: true, id: result.rows[0].id };
        } catch (error) {
            console.error('Erro addPartida:', error.message);
            throw error;
        }
    }

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
