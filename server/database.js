constructor() {
    console.log('🚀 Inicializando WAR Database no Render...');
    
    // URL do Render (ou variável de ambiente)
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
        console.error('❌ ERRO: DATABASE_URL não configurada no Render!');
        console.error('📋 Configure em: Environment → Add DATABASE_URL → Link Database');
        console.error('💡 O Render NÃO usa mais o Neon. Crie um PostgreSQL no Render.');
        
        // Modo desenvolvimento/sem banco
        this.setupDevMode();
        return;
    }
    
    console.log('✅ DATABASE_URL encontrada');
    
    // Configuração para Render PostgreSQL
    this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
            rejectUnauthorized: false  // Render requer SSL
        },
        max: 5,
        idleTimeoutMillis: 30000,
    });
    
    // Testar conexão
    this.testConnection();
}

async testConnection() {
    try {
        console.log('🔄 Testando conexão com PostgreSQL do Render...');
        const client = await this.pool.connect();
        
        // Testar consulta simples
        const result = await client.query('SELECT NOW() as hora, version() as versao');
        console.log('🎉 CONEXÃO BEM-SUCEDIDA com PostgreSQL do Render!');
        console.log(`   ⏰ Hora do servidor: ${result.rows[0].hora}`);
        console.log(`   🗄️  Versão PostgreSQL: ${result.rows[0].versao}`);
        
        client.release();
        
        // Criar tabelas
        await this.initDatabase();
        
    } catch (error) {
        console.error('💥 FALHA na conexão com PostgreSQL:', error.message);
        console.error('📋 Verifique:');
        console.error('   1. Database criado no Render?');
        console.error('   2. DATABASE_URL configurada corretamente?');
        console.error('   3. Aguardou 2-3 minutos após criar o database?');
        
        this.setupDevMode();
    }
}

setupDevMode() {
    console.log('⚠️  Usando modo desenvolvimento (dados em memória)');
    console.log('💡 Para usar PostgreSQL real:');
    console.log('   1. Crie PostgreSQL no Render');
    console.log('   2. Configure DATABASE_URL no Web Service');
    console.log('   3. Reinicie o deploy');
    
    this.devMode = true;
    this.devData = {
        jogadores: [
            { id: 1, nome: 'Comandante Silva', apelido: 'Silva', patente: 'General ⭐', status: 'Ativo' },
            { id: 2, nome: 'Capitão Santos', apelido: 'Santos', patente: 'Capitão 👮', status: 'Ativo' },
            { id: 3, nome: 'Tenente Costa', apelido: 'Costa', patente: 'Tenente ⚔️', status: 'Ativo' }
        ],
        partidas: []
    };
}
