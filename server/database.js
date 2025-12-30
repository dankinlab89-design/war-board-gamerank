const { Pool } = require('pg');

class WARDatabase {
    constructor() {
        // Usar variável de ambiente do Netlify DB (Neon)
        const databaseUrl = process.env.POSTGRES_URL;
        
        if (!databaseUrl) {
            console.error('❌ Variável POSTGRES_URL não encontrada!');
            throw new Error('Database URL não configurada. Configure o Netlify DB.');
        }
        
        console.log('📊 Conectando ao PostgreSQL (Neon)...');
        
        // Configurar pool para Neon
        this.pool = new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        
        // Testar conexão
        this.testConnection();
    }

    async testConnection() {
        try {
            const client = await this.pool.connect();
            console.log('✅ Conectado ao PostgreSQL com sucesso!');
            client.release();
            await this.initDatabase();
        } catch (error) {
            console.error('❌ Erro ao conectar ao PostgreSQL:', error.message);
            throw error;
        }
    }

    async initDatabase() {
        try {
            console.log('🔄 Inicializando tabelas...');
            
            // Criar tabela de Jogadores
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

            // Criar tabela de Partidas
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS partidas (
                    id SERIAL PRIMARY KEY,
                    data TIMESTAMP NOT NULL,
                    tipo VARCHAR(20) DEFAULT 'global',
                    campeonato VARCHAR(100),
                    vencedor_id INTEGER NOT NULL,
                    participantes TEXT NOT NULL,
                    observacoes TEXT,
                    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_vencedor FOREIGN KEY (vencedor_id) REFERENCES jogadores(id)
                )
            `);

            // Criar tabela de Ranking Mensal
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS ranking_mensal (
                    id SERIAL PRIMARY KEY,
                    mes_ano VARCHAR(7) NOT NULL,
                    jogador_id INTEGER NOT NULL,
                    partidas INTEGER DEFAULT 0,
                    vitorias INTEGER DEFAULT 0,
                    UNIQUE(mes_ano, jogador_id),
                    CONSTRAINT fk_jogador_rm FOREIGN KEY (jogador_id) REFERENCES jogadores(id)
                )
            `);

            // Criar índices para performance
            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_partidas_data 
                ON partidas(data DESC)
            `);

            await this.pool.query(`
                CREATE INDEX IF NOT EXISTS idx_partidas_vencedor 
                ON partidas(vencedor_id)
            `);

            console.log('✅ Tabelas criadas/verificadas com sucesso');
            
            // Verificar e inserir dados iniciais
            await this.verificarDadosIniciais();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar banco:', error);
            throw error;
        }
    }

    async verificarDadosIniciais() {
        try {
            // Verificar se já existem jogadores
            const result = await this.pool.query('SELECT COUNT(*) as count FROM jogadores');
            const count = parseInt(result.rows[0].count);
            
            if (count === 0) {
                console.log('📝 Inserindo dados iniciais...');
                await this.inserirDadosIniciais();
            } else {
                console.log(`✅ Já existem ${count} jogadores no banco`);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar dados iniciais:', error);
        }
    }

    async inserirDadosIniciais() {
        try {
            // Inserir jogadores de exemplo
            const jogadores = [
                ['Comandante Silva', 'Silva', 'silva@email.com', 'General ⭐'],
                ['Capitão Santos', 'Santos', 'santos@email.com', 'Capitão 👮'],
                ['Tenente Costa', 'Costa', 'costa@email.com', 'Tenente ⚔️'],
                ['Soldado Lima', 'Lima', 'lima@email.com', 'Soldado 🛡️'],
                ['Recruta Souza', 'Souza', 'souza@email.com', 'Cabo 🪖']
            ];

            for (const jogador of jogadores) {
                await this.pool.query(
                    `INSERT INTO jogadores (nome, apelido, email, patente) 
                     VALUES ($1, $2, $3, $4) 
                     ON CONFLICT (apelido) DO NOTHING`,
                    jogador
                );
            }

            console.log('✅ Jogadores iniciais inseridos');

            // Aguardar um pouco para garantir que os jogadores foram inseridos
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Inserir partidas de exemplo
            const partidas = [
                ['2024-01-15 20:00:00', 'global', 1, '1,2,3,4', 'Partida intensa'],
                ['2024-01-20 21:30:00', 'campeonato', 2, '1,2,5', 'Final emocionante'],
                ['2024-01-25 19:45:00', 'global', 1, '1,3,4,5', 'Vitória rápida'],
                ['2024-01-28 22:15:00', 'eliminatoria', 3, '2,3,4', 'Eliminatória tensa'],
                ['2024-02-01 20:30:00', 'global', 4, '1,2,3,4,5', 'Batalha épica']
            ];

            for (const partida of partidas) {
                await this.pool.query(
                    `INSERT INTO partidas (data, tipo, vencedor_id, participantes, observacoes)
                     VALUES ($1, $2, $3, $4, $5)`,
                    partida
                );
            }

            console.log('✅ Partidas iniciais inseridas');
            console.log('🎉 Banco de dados inicializado completamente!');

        } catch (error) {
            console.error('❌ Erro ao inserir dados iniciais:', error);
        }
    }

    // ============ MÉTODOS PARA JOGADORES ============
    
    async getJogadores() {
        try {
            const result = await this.pool.query(
                `SELECT * FROM jogadores 
                 WHERE status = 'Ativo' 
                 ORDER BY apelido`
            );
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar jogadores:', error);
            throw error;
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
                    'Cabo 🪖',
                    jogador.observacoes || ''
                ]
            );
            
            console.log(`✅ Jogador cadastrado: ${result.rows[0].apelido} (ID: ${result.rows[0].id})`);
            
            return { 
                sucesso: true, 
                id: result.rows[0].id,
                patente: result.rows[0].patente,
                apelido: result.rows[0].apelido
            };
        } catch (error) {
            console.error('Erro ao cadastrar jogador:', error);
            
            if (error.code === '23505') { // Violação de UNIQUE
                throw new Error(`Apelido "${jogador.apelido}" já está em uso`);
            }
            throw error;
        }
    }

    // ============ MÉTODOS PARA PARTIDAS ============
    
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
                LIMIT 100
            `);
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar partidas:', error);
            throw error;
        }
    }

    async addPartida(partida) {
        try {
            // Validar
            const participantes = partida.participantes.split(',').map(id => parseInt(id.trim()));
            if (participantes.length < 2) {
                throw new Error('É necessário pelo menos 2 participantes');
            }
            
            if (!participantes.includes(partida.vencedor_id)) {
                throw new Error('O vencedor deve estar entre os participantes');
            }
            
            const result = await this.pool.query(
                `INSERT INTO partidas (data, tipo, vencedor_id, participantes, observacoes)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [
                    partida.data || new Date().toISOString(),
                    partida.tipo || 'global',
                    partida.vencedor_id,
                    partida.participantes,
                    partida.observacoes || ''
                ]
            );
            
            console.log(`✅ Partida registrada: ID=${result.rows[0].id}`);
            
            return { 
                sucesso: true, 
                id: result.rows[0].id
            };
        } catch (error) {
            console.error('Erro ao registrar partida:', error);
            throw error;
        }
    }

    // ============ MÉTODOS PARA RANKINGS ============
    
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
                LEFT JOIN partidas p ON (
                    ',' || p.participantes || ',' LIKE '%,' || j.id || ',%'
                )
                WHERE j.status = 'Ativo'
                GROUP BY j.id, j.apelido, j.patente
                ORDER BY vitorias DESC, partidas DESC, j.apelido
            `);
            return result.rows;
        } catch (error) {
            console.error('Erro ao calcular ranking:', error);
            throw error;
        }
    }

    async getEstatisticas() {
        try {
            const result = await this.pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM jogadores WHERE status = 'Ativo') as total_jogadores,
                    (SELECT COUNT(*) FROM partidas) as total_partidas,
                    (SELECT MAX(vitorias) FROM (
                        SELECT vencedor_id, COUNT(*) as vitorias
                        FROM partidas
                        GROUP BY vencedor_id
                    ) as subquery) as record_vitorias
            `);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw error;
        }
    }

    // Método utilitário
    async getJogadorById(id) {
        try {
            const result = await this.pool.query('SELECT * FROM jogadores WHERE id = $1', [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Erro ao buscar jogador:', error);
            throw error;
        }
    }

    // Fechar conexões
    async close() {
        await this.pool.end();
        console.log('🔒 Conexão com banco fechada');
    }
}

// Singleton
let databaseInstance = null;

function getDatabase() {
    if (!databaseInstance) {
        databaseInstance = new WARDatabase();
    }
    return databaseInstance;
}

module.exports = { getDatabase };
