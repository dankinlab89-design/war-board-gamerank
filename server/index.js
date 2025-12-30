const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Simulação de banco de dados em memória (substitua por SQLite real)
let jogadores = [
  { id: 1, nome: 'Comandante Silva', apelido: 'Silva', email: 'silva@email.com', patente: 'General ⭐', status: 'Ativo' },
  { id: 2, nome: 'Capitão Santos', apelido: 'Santos', email: 'santos@email.com', patente: 'Capitão 👮', status: 'Ativo' },
  { id: 3, nome: 'Tenente Costa', apelido: 'Costa', email: 'costa@email.com', patente: 'Tenente ⚔️', status: 'Ativo' },
  { id: 4, nome: 'Soldado Lima', apelido: 'Lima', email: 'lima@email.com', patente: 'Soldado 🛡️', status: 'Ativo' },
  { id: 5, nome: 'Recruta Souza', apelido: 'Souza', email: 'souza@email.com', patente: 'Cabo 🪖', status: 'Ativo' }
];

let partidas = [
  { id: 1, data: '2024-01-15', tipo: 'global', vencedor_id: 1, participantes: '1,2,3,4', vencedor_nome: 'Silva', observacoes: 'Partida intensa' },
  { id: 2, data: '2024-01-20', tipo: 'campeonato', vencedor_id: 2, participantes: '1,2,5', vencedor_nome: 'Santos', observacoes: 'Final emocionante' },
  { id: 3, data: '2024-02-05', tipo: 'global', vencedor_id: 1, participantes: '1,3,4,5', vencedor_nome: 'Silva', observacoes: 'Vitória rápida' }
];

// Rotas da API
app.get('/api/jogadores', (req, res) => {
  res.json(jogadores.filter(j => j.status === 'Ativo'));
});

app.post('/api/jogadores', (req, res) => {
  const novoJogador = {
    id: jogadores.length + 1,
    ...req.body,
    patente: 'Cabo 🪖',
    status: 'Ativo',
    data_cadastro: new Date().toISOString()
  };
  jogadores.push(novoJogador);
  res.json({ 
    sucesso: true, 
    id: novoJogador.id,
    mensagem: 'Jogador cadastrado com sucesso!' 
  });
});

app.get('/api/partidas', (req, res) => {
  res.json(partidas);
});

app.post('/api/partidas', (req, res) => {
  const novaPartida = {
    id: partidas.length + 1,
    ...req.body,
    data: new Date().toISOString()
  };
  partidas.unshift(novaPartida);
  res.json({ 
    sucesso: true, 
    id: novaPartida.id,
    mensagem: 'Partida registrada com sucesso!' 
  });
});

app.get('/api/ranking/global', (req, res) => {
  const ranking = jogadores.map(jogador => {
    const partidasJogadas = partidas.filter(p => 
      p.participantes.split(',').includes(jogador.id.toString())
    ).length;
    
    const vitorias = partidas.filter(p => 
      p.vencedor_id === jogador.id
    ).length;
    
    return {
      id: jogador.id,
      apelido: jogador.apelido,
      patente: jogador.patente,
      partidas: partidasJogadas,
      vitorias: vitorias
    };
  }).sort((a, b) => b.vitorias - a.vitorias);
  
  res.json(ranking);
});

app.get('/api/ranking/mensal/:mesAno', (req, res) => {
  const [mes, ano] = req.params.mesAno.split('/');
  const partidasMes = partidas.filter(p => {
    const data = new Date(p.data);
    return (data.getMonth() + 1) === parseInt(mes) && 
           data.getFullYear() === parseInt(ano);
  });
  
  const ranking = jogadores.map(jogador => {
    const partidasJogadas = partidasMes.filter(p => 
      p.participantes.split(',').includes(jogador.id.toString())
    ).length;
    
    const vitorias = partidasMes.filter(p => 
      p.vencedor_id === jogador.id
    ).length;
    
    return {
      id: jogador.id,
      apelido: jogador.apelido,
      patente: jogador.patente,
      partidas: partidasJogadas,
      vitorias: vitorias
    };
  }).filter(r => r.partidas > 0)
    .sort((a, b) => b.vitorias - a.vitorias);
  
  res.json(ranking);
});

app.get('/api/vencedores/:ano', (req, res) => {
  const ano = req.params.ano;
  const vencedores = [];
  
  for (let mes = 1; mes <= 12; mes++) {
    const mesAno = `${mes.toString().padStart(2, '0')}/${ano}`;
    const partidasMes = partidas.filter(p => {
      const data = new Date(p.data);
      return (data.getMonth() + 1) === mes && 
             data.getFullYear() === parseInt(ano);
    });
    
    if (partidasMes.length > 0) {
      const vitoriasPorJogador = {};
      partidasMes.forEach(p => {
        vitoriasPorJogador[p.vencedor_id] = (vitoriasPorJogador[p.vencedor_id] || 0) + 1;
      });
      
      const vencedorId = Object.keys(vitoriasPorJogador).reduce((a, b) => 
        vitoriasPorJogador[a] > vitoriasPorJogador[b] ? a : b
      );
      
      const jogador = jogadores.find(j => j.id === parseInt(vencedorId));
      if (jogador) {
        vencedores.push({
          mes_ano: mesAno,
          vencedor: jogador.apelido,
          vitorias: vitoriasPorJogador[vencedorId],
          patente: jogador.patente
        });
      }
    }
  }
  
  res.json(vencedores);
});

app.get('/api/estatisticas', (req, res) => {
  const total_jogadores = jogadores.filter(j => j.status === 'Ativo').length;
  const total_partidas = partidas.length;
  
  const vitoriasPorJogador = {};
  partidas.forEach(p => {
    vitoriasPorJogador[p.vencedor_id] = (vitoriasPorJogador[p.vencedor_id] || 0) + 1;
  });
  
  const record_vitorias = Object.values(vitoriasPorJogador).length > 0 
    ? Math.max(...Object.values(vitoriasPorJogador))
    : 0;
  
  res.json({
    total_jogadores,
    total_partidas,
    record_vitorias
  });
});

// Rota principal
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Para Netlify Functions
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

// Para desenvolvimento local
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
  });
}