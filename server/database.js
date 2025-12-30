// Adicionar no início do arquivo
require('dotenv').config(); // Para desenvolvimento local

class WARDatabase {
    constructor() {
        console.log('🚀 WAR Database - Inicializando para Render...');
        
        // Configuração para Render
        const databaseUrl = process.env.DATABASE_URL;
        
        if (!databaseUrl) {
            console.log('⚠️  DATABASE_URL não encontrada.');
            console.log('📋 Para Render:');
            console.log('   1. Vá em Dashboard → Environment');
            console.log('   2. Add Environment Variable');
            console.log('   3. Nome: DATABASE_URL');
            console.log('   4. Valor: (copie do seu PostgreSQL no Render)');
            this.setupDevMode();
            return;
        }
        
        console.log('✅ DATABASE_URL configurada');
        
        // Configuração otimizada para Render
        const config = {
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false // Requerido pelo Render
            },
            max: 10, // Aumentar conexões para Render
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000 // Reduzir timeout
        };
        
        this.pool = new Pool(config);
        console.log('📊 Pool de conexões PostgreSQL configurado');
        
        // Testar conexão
        this.testConnection();
    }

    async testConnection() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as time, version() as version');
            console.log('✅ PostgreSQL conectado:', result.rows[0].time);
            console.log('📋 Versão:', result.rows[0].version.split(',')[0]);
            client.release();
            
            // Criar tabelas se não existirem
            await this.initDatabase();
        } catch (error) {
            console.error('❌ Erro ao conectar no PostgreSQL:', error.message);
            console.log('🔧 Usando modo desenvolvimento...');
            this.setupDevMode();
        }
    }
    
    // ... resto do código mantido ...
}

const { Pool } = require('pg');

class WARDatabase {
    constructor() {
        console.log('🚀 WAR Database - Inicializando...');
        
        // Verificar variáveis de ambiente
        console.log('🔍 Verificando configuração...');
        
        // O Render usa DATABASE_URL automaticamente quando linka o database
        const databaseUrl = process.env.DATABASE_URL;
        
        if (!databaseUrl) {
            console.log('⚠️  DATABASE_URL não encontrada. Usando modo desenvolvimento.');
            console.log('💡 Para produção no Render:');
            console.log('   1. Crie PostgreSQL no Render');
            console.log('   2. Vá em Web Service → Environment');
            console.log('   3. Add DATABASE_URL → Link Database');
            
            this.setupDevMode();
            return;
        }
        
        console.log('✅ DATABASE_URL configurada');
        
        try {
            // Configurar pool de conexões para Render
            const config = {
                connectionString: databaseUrl,
                // Render PostgreSQL requer SSL
                ssl: databaseUrl.includes('render.com') ? {
                    rejectUnauthorized: false
                } : false,
                max: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000
            };
            
            this.pool = new Pool(config);
            console.log('📊 Pool de conexões configurado');
            
            // Testar conexão assíncrona
            this.testConnectionAsync();
            
        } catch (error) {
            console.error('❌ Erro ao configurar pool:', error.message);
            this.setupDevMode();
        }
    }

    async testConnectionAsync() {
        let retries = 3;
        
        while (retries > 0) {
            try {
                console.log(`🔄 Testando conexão (${4-retries}/3)...`);
                const client = await this.pool.connect();
                
                // Teste simples
                await client.query('SELECT 1 as test');
                console.log('🎉 Conexão com PostgreSQL estabelecida!');
                
                client.release();
                
                // Inicializar banco
                await this.initDatabase();
                return;
                
            } catch (error) {
                retries--;
                console.error(`❌ Falha na conexão: ${error.message}`);
                
                if (retries === 0) {
                    console.error('💥 Não foi possível conectar ao PostgreSQL');
                    console.error('📋 Verifique:');
                    console.error('   1. Database foi criado no Render?');
                    console.error('   2. Aguardou 3 minutos após criar?');
                    console.error('   3. DATABASE_URL está linkada corretamente?');
                    
                    this.setupDevMode();
                } else {
                    // Aguardar antes de tentar novamente
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    }

    setupDevMode() {
        console.log('🔧 Usando modo desenvolvimento (dados em memória)');
        this.devMode = true;
        this.devData = {
            jogadores: [
                { id: 1, nome: 'Comandante Silva', apelido: 'Silva', patente: 'General ⭐', status: 'Ativo', data_cadastro: new Date().toISOString() },
                { id: 2, nome: 'Capitão Santos', apelido: 'Santos', patente: 'Capitão 👮', status: 'Ativo', data_cadastro: new Date().toISOString() },
                { id: 3, nome: 'Tenente Costa', apelido: 'Costa', patente: 'Tenente ⚔️', status: 'Ativo', data_cadastro: new Date().toISOString() }
            ],
            partidas: []
        };
    }

    async initDatabase() {
        if (this.devMode) {
            console.log('📝 Modo dev: pulando criação de tabelas');
            return;
        }
        
        try {
            console.log('🔄 Criando tabelas se não existirem...');
            
            // 1. Tabela jogadores
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
            
            // 2. Tabela partidas
            await this.pool.query(`
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
            await this.checkInitialData();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar banco:', error.message);
        }
    }

    async checkInitialData() {
        if (this.devMode) return;
        
        try {
            const result = await this.pool.query('SELECT COUNT(*) as count FROM jogadores');
            const count = parseInt(result.rows[0].count);
            
            if (count === 0) {
                console.log('📝 Inserindo dados iniciais...');
                await this.insertInitialData();
            } else {
                console.log(`✅ Banco já possui ${count} jogadores`);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar dados:', error.message);
        }
    }

    async insertInitialData() {
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

    // ============ MÉTODOS PÚBLICOS ============
    
    async getJogadores() {
        if (this.devMode) {
            return this.devData.jogadores;
        }
        
        try {
            const result = await this.pool.query(
                "SELECT * FROM jogadores WHERE status = 'Ativo' ORDER BY apelido"
            );
            return result.rows;
        } catch (error) {
            console.error('Erro ao buscar jogadores:', error.message);
            return this.devMode ? this.devData.jogadores : [];
        }
    }

    async addJogador(jogador) {
        // Validação
        if (!jogador.nome || !jogador.apelido) {
            throw new Error('Nome e apelido são obrigatórios');
        }
        
        if (this.devMode) {
            const newId = this.devData.jogadores.length + 1;
            const novoJogador = {
                id: newId,
                ...jogador,
                patente: 'Cabo 🪖',
                status: 'Ativo',
                data_cadastro: new Date().toISOString()
            };
            this.devData.jogadores.push(novoJogador);
            return { sucesso: true, id: newId, patente: 'Cabo 🪖' };
        }
        
        try {
            const result = await this.pool.query(
                `INSERT INTO jogadores (nome, apelido, email, observacoes) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id`,
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
                patente: 'Cabo 🪖'
            };
        } catch (error) {
            console.error('Erro ao cadastrar jogador:', error.message);
            throw error;
        }
    }

    async getPartidas() {
        if (this.devMode) {
            return this.devData.partidas;
        }
        
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
            console.error('Erro ao buscar partidas:', error.message);
            return [];
        }
    }

    async addPartida(partida) {
        // Validação: mínimo 3 participantes
        const participantes = partida.participantes ? 
            partida.participantes.split(',').map(id => parseInt(id.trim())) : [];
        
        if (participantes.length < 3) {
            throw new Error('É necessário pelo menos 3 participantes');
        }
        
        if (!participantes.includes(partida.vencedor_id)) {
            throw new Error('O vencedor deve estar entre os participantes');
        }
        
        if (this.devMode) {
            const newId = this.devData.partidas.length + 1;
            const novaPartida = {
                id: newId,
                ...partida,
                data: new Date().toISOString(),
                vencedor_nome: 'Jogador ' + partida.vencedor_id
            };
            this.devData.partidas.unshift(novaPartida);
            return { sucesso: true, id: newId };
        }
        
        try {
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
            console.error('Erro ao registrar partida:', error.message);
            throw error;
        }
    }

    async getRankingGlobal() {
        if (this.devMode) {
            return this.devData.jogadores.map(j => ({
                ...j,
                partidas: 0,
                vitorias: 0
            }));
        }
        
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
            console.error('Erro ao calcular ranking:', error.message);
            return [];
        }
    }

    async getEstatisticas() {
        if (this.devMode) {
            return {
                total_jogadores: this.devData.jogadores.length,
                total_partidas: this.devData.partidas.length,
                record_vitorias: 0
            };
        }
        
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
            console.error('Erro ao buscar estatísticas:', error.message);
            return {
                total_jogadores: 0,
                total_partidas: 0,
                record_vitorias: 0
            };
        }
    }
}

// Singleton simplificado
let databaseInstance = null;

function getDatabase() {
    if (!databaseInstance) {
        console.log('🆕 Criando nova instância do banco...');
        databaseInstance = new WARDatabase();
    }
    return databaseInstance;
}

module.exports = { getDatabase };

