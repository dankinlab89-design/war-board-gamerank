// server/backup.js - Sistema de backup automático
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class DatabaseBackup {
    constructor() {
        this.databaseUrl = 'postgresql://wardb_user:pRNwj9TZ3F4Dbk2fdT0vdgTkdsYG17LB@dpg-d5a44u6mcj7s73c5q070-a/war_database_1k0z';
        this.backupDir = path.join(__dirname, 'backups');
        
        // Criar pasta de backups se não existir
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        
        // Configurar email (substitua com seus dados)
        this.emailConfig = {
            service: 'gmail', // ou 'outlook', 'yahoo', etc
            auth: {
                user: 'seuemail@gmail.com', // SEU EMAIL AQUI
                pass: 'sua-senha-app' // Senha de app do Gmail
            }
        };
    }
    
    async createBackup() {
        console.log('📦 Criando backup do banco...');
        
        const pool = new Pool({
            connectionString: this.databaseUrl,
            ssl: { rejectUnauthorized: false }
        });
        
        try {
            // 1. Backup de jogadores
            const jogadores = await pool.query('SELECT * FROM jogadores ORDER BY id');
            
            // 2. Backup de partidas
            const partidas = await pool.query('SELECT * FROM partidas ORDER BY id');
            
            // 3. Criar arquivo JSON com timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = `backup-${timestamp}.json`;
            const backupPath = path.join(this.backupDir, backupFile);
            
            const backupData = {
                timestamp: new Date().toISOString(),
                jogadores: jogadores.rows,
                partidas: partidas.rows,
                total_jogadores: jogadores.rows.length,
                total_partidas: partidas.rows.length
            };
            
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
            console.log(`✅ Backup criado: ${backupFile}`);
            
            // 4. Enviar por email
            await this.sendEmailBackup(backupPath, backupFile);
            
            // 5. Manter apenas últimos 7 backups
            this.cleanOldBackups();
            
            return { success: true, file: backupFile };
            
        } catch (error) {
            console.error('❌ Erro no backup:', error);
            return { success: false, error: error.message };
        } finally {
            await pool.end();
        }
    }
    
    async sendEmailBackup(backupPath, backupFile) {
        try {
            const transporter = nodemailer.createTransport(this.emailConfig);
            
            const mailOptions = {
                from: this.emailConfig.auth.user,
                to: 'seuemail@gmail.com', // SEU EMAIL PARA RECEBER
                subject: `📊 Backup WAR Board GameRank - ${new Date().toLocaleDateString('pt-BR')}`,
                text: `Backup automático do sistema WAR Board GameRank\nData: ${new Date().toLocaleString('pt-BR')}\nTotal jogadores: (ver anexo)`,
                attachments: [
                    {
                        filename: backupFile,
                        path: backupPath,
                        contentType: 'application/json'
                    }
                ]
            };
            
            await transporter.sendMail(mailOptions);
            console.log('📧 Backup enviado por email com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao enviar email:', error);
        }
    }
    
    cleanOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
                .map(f => ({
                    name: f,
                    time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);
            
            // Manter apenas últimos 7 backups
            if (files.length > 7) {
                files.slice(7).forEach(file => {
                    fs.unlinkSync(path.join(this.backupDir, file.name));
                    console.log(`🗑️  Backup antigo removido: ${file.name}`);
                });
            }
        } catch (error) {
            console.error('Erro ao limpar backups:', error);
        }
    }
    
    // API para backup manual via web
    async manualBackup(req, res) {
        const result = await this.createBackup();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Backup criado e enviado por email',
                file: result.file,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    }
    
    // Listar backups disponíveis
    listBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
                .map(f => ({
                    name: f,
                    path: path.join(this.backupDir, f),
                    size: fs.statSync(path.join(this.backupDir, f)).size,
                    date: fs.statSync(path.join(this.backupDir, f)).mtime
                }))
                .sort((a, b) => b.date - a.date);
            
            return files;
        } catch (error) {
            console.error('Erro ao listar backups:', error);
            return [];
        }
    }
}

module.exports = DatabaseBackup;
