const express = require('express');
const serverless = require('serverless-http');
const database = require('../../server/database');

const app = express();

// Mesmas rotas do servidor principal
app.get('/.netlify/functions/api/jogadores', (req, res) => {
  database.getJogadores((err, jogadores) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(jogadores);
    }
  });
});

// ... adicione todas as outras rotas aqui

module.exports.handler = serverless(app);