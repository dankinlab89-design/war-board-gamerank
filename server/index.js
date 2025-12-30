const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../public')));

// ============ BANCO DE DADOS SIMPLES ============
console.log('📊 Inicializando banco de dados...');

// Dados em memória (temporário)
let jogadores = [
  { id: 1, nome: 'Comandante Silva', apelido: 'Silva', patente: 'General ⭐', email: 'silva@email.com', status: 'Ativo' },
  { id: 2, nome: 'Capitão Santos', apelido: 'Santos', patente: 'Capitão 👮', email: 'santos@email.com', status: 'Ativo' },
  { id: 3, nome: 'Tenente Costa', apelido: 'Costa', patente: 'Tenente ⚔️', email: 'costa@email.com', status: 'Ativo' }
];

let partidas = [];

// ============ ROTAS DA API ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online',
    service: 'WAR Board GameRank',
    database: 'memória',
    timestamp: new Date().toISOString()
  });
});

// GET todos jogadores
app.get('/api/jogadores', (req, res) => {
  res.json(jogadores);
});

// POST cadastrar jogador
app.post('/api/jogadores', (req, res) => {
  const { nome, apelido, email, observacoes } = req.body;
  
  if (!nome || !apelido) {
    return res.status(400).json({ error: 'Nome e apelido são obrigatórios' });
  }
  
  // Verificar se apelido já existe
  if (jogadores.some(j => j.apelido === apelido)) {
    return res.status(400).json({ error: 'Apelido já está em uso' });
  }
  
  const novoJogador = {
    id: jogadores.length > 0 ? Math.max(...jogadores.map(j => j.id)) + 1 : 1,
    nome: nome.trim(),
    apelido: apelido.trim(),
    email: email?.trim() || null,
    patente: 'Cabo 🪖',
    status: 'Ativo',
    data_cadastro: new Date().toISOString(),
    observacoes: observacoes?.trim() || ''
  };
  
  jogadores.push(novoJogador);
  
  res.json({
    sucesso: true,
    id: novoJogador.id,
    patente: novoJogador.patente,
    mensagem: `Jogador ${apelido} cadastrado com sucesso!`
  });
});

// GET todas partidas
app.get('/api/partidas', (req, res) => {
  // Adicionar informações do vencedor
  const partidasComVencedor = partidas.map(p => ({
    ...p,
    vencedor_nome: jogadores.find(j => j.id === p.vencedor_id)?.apelido || `Jogador ${p.vencedor_id}`
  }));
  
  res.json(partidasComVencedor);
});

// POST cadastrar partida
app.post('/api/partidas', (req, res) => {
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
  
  const novaPartida = {
    id: partidas.length > 0 ? Math.max(...partidas.map(p => p.id)) + 1 : 1,
    data: new Date().toISOString(),
    tipo: tipo || 'global',
    vencedor_id: parseInt(vencedor_id),
    participantes: participantes,
    observacoes: observacoes || ''
  };
  
  partidas.unshift(novaPartida); // Adiciona no início
  
  res.json({
    sucesso: true,
    id: novaPartida.id,
    mensagem: 'Partida registrada com sucesso!'
  });
});

// GET ranking global
app.get('/api/ranking/global', (req, res) => {
  const ranking = jogadores.map(jogador => {
    const partidasJogador = partidas.filter(p => 
      p.participantes.split(',').includes(jogador.id.toString())
    );
    
    const vitorias = partidas.filter(p => 
      p.vencedor_id === jogador.id
    ).length;
    
    return {
      id: jogador.id,
      apelido: jogador.apelido,
      patente: jogador.patente,
      partidas: partidasJogador.length,
      vitorias: vitorias
    };
  }).sort((a, b) => b.vitorias - a.vitorias);
  
  res.json(ranking);
});

// GET estatísticas
app.get('/api/estatisticas', (req, res) => {
  const recordVitorias = Math.max(...jogadores.map(j => 
    partidas.filter(p => p.vencedor_id === j.id).length
  ), 0);
  
  res.json({
    total_jogadores: jogadores.length,
    total_partidas: partidas.length,
    record_vitorias: recordVitorias
  });
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
  console.log(`🗄️  Banco: Memória (${jogadores.length} jogadores)`);
});
