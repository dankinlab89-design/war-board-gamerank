#!/bin/bash
echo "🚀 Iniciando deploy para Render..."

# Instalar dependências
npm install

# Verificar estrutura
echo "📁 Verificando estrutura de arquivos..."
if [ ! -d "public" ]; then
    echo "❌ Pasta 'public' não encontrada"
    exit 1
fi

if [ ! -f "server/index.js" ]; then
    echo "❌ Arquivo 'server/index.js' não encontrado"
    exit 1
fi

echo "✅ Estrutura verificada"
echo "📦 Sistema pronto para deploy no Render!"
