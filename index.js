// index.js - Versão simplificada
console.log('🚀 Iniciando WAR Board GameRank...');

// Tentar carregar .env para desenvolvimento
try {
  require('dotenv').config();
} catch (error) {
  console.log('⚠️  dotenv não instalado, usando variáveis de ambiente do Render');
}

// Iniciar servidor
require('./server/index.js');
