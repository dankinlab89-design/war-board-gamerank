const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class WARDatabase {
    constructor() {
        // No Netlify Functions, usamos /tmp para persistência
        this.dbPath = '/tmp/war_database.db';
        
        // Para desenvolvimento local
        if (process.env.NETLIFY_DEV) {
            this.dbPath = path.join(__dirname, 'db', 'war_database.db');
            // Garantir que a pasta existe
            if (!fs.existsSync(path.join(__dirname, 'db'))) {
                fs.mkdirSync(path.join(__dirname, 'db'), { recursive: true });
            }
        }
        
        console.log('📁 Caminho do banco:', this.dbPath);
        this.db = new Database(this.dbPath);
        this.initDatabase();
    }

    initDatabase() {
        console.log('🔄 Inicializando banco de dados...');
        
        // Criar tabela de Jogadores
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS jogadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                apelido TEXT UNIQUE NOT NULL,
                email TEXT,
                patente TEXT DEFAULT 'Cabo 🪖',
                status TEXT DEFAULT 'Ativo',
                data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP,
                observacoes TEXT
            )
        `);

        // Criar tabela de Partidas
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS partidas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data DATETIME NOT NULL,
                tipo TEXT DEFAULT 'global',
                campeonato TEXT,
                vencedor_id INTEGER NOT NULL,
                participantes TEXT NOT NULL,
                observacoes TEXT,
                data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Criar tabela de Ranking Mensal
        this.db.exec(`
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

        // Criar tabela de Vencedores Mensais
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS vencedores_mensais (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mes_ano TEXT UNIQUE NOT NULL,
                jogador_id INTEGER NOT NULL,
                vitorias INTEGER DEFAULT 0,
                FOREIGN KEY (jogador_id) REFERENCES jogadores (id)
            )
        `);

        // Criar índice para melhor performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_partidas_data 
            ON partidas(data DESC)
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_partidas_vencedor 
            ON partidas(vencedor_id)
        `);

        console.log('✅ Banco de dados inicializado');
        
        // Inserir dados iniciais se estiver vazio
        this.insertInitialData();
    }

    insertInitialData() {
        try {
            // Verificar se já existem jogadores
            const jogadoresCount = this.db.prepare('SELECT COUNT(*) as count FROM jogadores').get().count;
            
            if (jogadoresCount === 0) {
                console.log('📝 Inserindo dados iniciais...');
                
                const insertJogador = this.db.prepare(`
                    INSERT INTO jogadores (nome, apelido, email, patente)
                    VALUES (?, ?, ?, ?)
                `);

                // Jogadores de exemplo
                const jogadoresIniciais = [
                    ['Comandante Silva', 'Silva', 'silva@email.com', 'General ⭐'],
                    ['Capitão Santos', 'Santos', 'santos@email.com', 'Capitão 👮'],
                    ['Tenente Costa', 'Costa', 'costa@email.com', 'Tenente ⚔️'],
                    ['Soldado Lima', 'Lima', 'lima@email.com', 'Soldado 🛡️'],
                    ['Recruta Souza', 'Souza', 'souza@email.com', 'Cabo 🪖']
                ];

                // Inserir em transação
                const insertMany = this.db.transaction((jogadores) => {
                    for (const jogador of jogadores) {
                        insertJogador.run(jogador);
                    }
                });

                insertMany(jogadoresIniciais);
                console.log(`✅ ${jogadoresIniciais.length} jogadores iniciais inseridos`);
            }

            // Verificar se já existem partidas
            const partidasCount = this.db.prepare('SELECT COUNT(*) as count FROM partidas').get().count;
            
            if (partidasCount === 0) {
                console.log('📝 Inserindo partidas iniciais...');
                
                const insertPartida = this.db.prepare(`
                    INSERT INTO partidas (data, tipo, vencedor_id, participantes, observacoes)
                    VALUES (?, ?, ?, ?, ?)
                `);

                // Partidas de exemplo
                const partidasIniciais = [
                    ['2024-01-15', 'global', 1, '1,2,3,4', 'Partida intensa no território europeu'],
                    ['2024-01-20', 'campeonato', 2, '1,2,5', 'Final do campeonato de inverno'],
                    ['2024-01-25', 'global', 1, '1,3,4,5', 'Conquista rápida da Oceania'],
                    ['2024-01-28', 'eliminatoria', 3, '2,3,4', 'Eliminatória tensa até o final'],
                    ['2024-02-01', 'global', 4, '1,2,3,4,5', 'Batalha épica com 5 jogadores']
                ];

                const insertPartidas = this.db.transaction((partidas) => {
                    for (const partida of partidas) {
                        insertPartida.run(partida);
                    }
                });

                insertPartidas(partidasIniciais);
                console.log(`✅ ${partidasIniciais.length} partidas iniciais inseridas`);
            }

        } catch (error) {
            console.error('❌ Erro ao inserir dados iniciais:', error);
        }
    }

    // ============ MÉTODOS PARA JOGADORES ============
    
    getJogadores() {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM jogadores 
                WHERE status = 'Ativo' 
                ORDER BY apelido
            `);
            return stmt.all();
        } catch (error) {
            console.error('Erro ao buscar jogadores:', error);
            throw error;
        }
    }

    addJogador(jogador) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO jogadores (nome, apelido, email, patente, observacoes)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            // Todos começam como Cabo
            const patenteInicial = 'Cabo 🪖';
            
            const result = stmt.run(
                jogador.nome,
                jogador.apelido,
                jogador.email || null,
                patenteInicial,
                jogador.observacoes || ''
            );
            
            console.log(`✅ Jogador cadastrado: ID=${result.lastInsertRowid}, Apelido=${jogador.apelido}`);
            
            return { 
                sucesso: true, 
                id: result.lastInsertRowid,
                patente: patenteInicial
            };
        } catch (error) {
            console.error('Erro ao cadastrar jogador:', error);
            
            // Verificar se é erro de apelido duplicado
            if (error.message.includes('UNIQUE')) {
                throw new Error(`Apelido "${jogador.apelido}" já está em uso`);
            }
            throw error;
        }
    }

    // ============ MÉTODOS PARA PARTIDAS ============
    
    getPartidas() {
        try {
            const stmt = this.db.prepare(`
                SELECT 
                    p.*,
                    j.apelido as vencedor_nome,
                    j.patente as vencedor_patente
                FROM partidas p
                LEFT JOIN jogadores j ON p.vencedor_id = j.id
                ORDER BY p.data DESC
                LIMIT 100
            `);
            return stmt.all();
        } catch (error) {
            console.error('Erro ao buscar partidas:', error);
            throw error;
        }
    }

    addPartida(partida) {
        try {
            // Validar participantes
            const participantes = partida.participantes.split(',').map(id => parseInt(id.trim()));
            if (participantes.length < 2) {
                throw new Error('É necessário pelo menos 2 participantes');
            }
            
            if (!participantes.includes(partida.vencedor_id)) {
                throw new Error('O vencedor deve estar entre os participantes');
            }
            
            const stmt = this.db.prepare(`
                INSERT INTO partidas (data, tipo, vencedor_id, participantes, observacoes)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(
                partida.data || new Date().toISOString().split('T')[0],
                partida.tipo || 'global',
                partida.vencedor_id,
                partida.participantes,
                partida.observacoes || ''
            );
            
            console.log(`✅ Partida registrada: ID=${result.lastInsertRowid}`);
            
            return { 
                sucesso: true, 
                id: result.lastInsertRowid
            };
        } catch (error) {
            console.error('Erro ao registrar partida:', error);
            throw error;
        }
    }

    // ============ MÉTODOS PARA RANKINGS ============
    
    getRankingGlobal() {
        try {
            const stmt = this.db.prepare(`
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
                GROUP BY j.id
                ORDER BY vitorias DESC, partidas DESC, j.apelido
            `);
            return stmt.all();
        } catch (error) {
            console.error('Erro ao calcular ranking:', error);
            throw error;
        }
    }

    getRankingMensal(mesAno) {
        try {
            const stmt = this.db.prepare(`
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
            `);
            return stmt.all(mesAno);
        } catch (error) {
            console.error('Erro ao buscar ranking mensal:', error);
            throw error;
        }
    }

    getVencedoresMensais(ano) {
        try {
            const stmt = this.db.prepare(`
                SELECT 
                    vm.mes_ano,
                    j.apelido as vencedor,
                    vm.vitorias,
                    j.patente
                FROM vencedores_mensais vm
                JOIN jogadores j ON vm.jogador_id = j.id
                WHERE vm.mes_ano LIKE ? || '%'
                ORDER BY vm.mes_ano DESC
            `);
            return stmt.all(ano + '%');
        } catch (error) {
            console.error('Erro ao buscar vencedores mensais:', error);
            throw error;
        }
    }

    getEstatisticas() {
        try {
            const stmt = this.db.prepare(`
                SELECT 
                    COUNT(DISTINCT j.id) as total_jogadores,
                    COUNT(DISTINCT p.id) as total_partidas,
                    (
                        SELECT MAX(vitorias) FROM (
                            SELECT vencedor_id, COUNT(*) as vitorias
                            FROM partidas
                            GROUP BY vencedor_id
                        )
                    ) as record_vitorias
                FROM jogadores j
                LEFT JOIN partidas p ON 1=1
                WHERE j.status = 'Ativo'
            `);
            return stmt.get();
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw error;
        }
    }

    // ============ MÉTODOS DE UTILIDADE ============
    
    getJogadorById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM jogadores WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('Erro ao buscar jogador:', error);
            throw error;
        }
    }

    backupDatabase() {
        try {
            const backupPath = this.dbPath.replace('.db', `_backup_${Date.now()}.db`);
            this.db.backup(backupPath);
            console.log(`💾 Backup criado: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            throw error;
        }
    }

    close() {
        this.db.close();
        console.log('🔒 Conexão com banco fechada');
    }
}

// Singleton para Netlify Functions
let databaseInstance = null;

function getDatabase() {
    if (!databaseInstance) {
        console.log('🆕 Criando nova instância do banco');
        databaseInstance = new WARDatabase();
    }
    return databaseInstance;
}

module.exports = { getDatabase };
