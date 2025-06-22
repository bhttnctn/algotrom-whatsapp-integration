require('dotenv').config();
const express = require('express');
const sql = require('mssql');

const dbConfig = require('./src/config/db.config');
const webhookHandler = require('./src/controllers/whatsapp.controller');

const app = express();
const PORT = process.env.PORT || 28080;

app.use(express.json());

// Ana sayfa
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <style>
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        font-family: Arial, sans-serif;
                        background: #f9f9f9;
                    }
                    .content {
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="content">
                    <p>Bu Algotrom WhatsApp Entegrasyon uygulamasıdır.</p>
                    <p>🚀 İş Akışınızı Akıllandırın, Geleceği Şimdi Yönetin!</p>
                    <p>Algotrom ile E-Flow'la tanışın!</p>
                    <a href="https://algotrom.com.tr/" target="_blank">https://algotrom.com.tr/</a>
                </div>
            </body>
        </html>
    `);
});

// Webhook doğrulama
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
    const { ["hub.mode"]: mode, ["hub.verify_token"]: token, ["hub.challenge"]: challenge } = req.query;

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("Webhook verified!");
        return res.status(200).send(challenge);
    }

    res.sendStatus(403);
});

// Webhook mesaj işleme
app.post('/webhook', async (req, res) => {
    console.log("Webhook POST alındı");
    try {
        await webhookHandler(req, res);
    } catch (err) {
        console.error("Webhook işleme hatası:", err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// MSSQL test endpoint
app.get('/db/data', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM GITEA.dbo.version');
        res.json(result.recordset);
    } catch (err) {
        console.error('DB Hatası:', err);
        res.status(500).json({ message: 'Veritabanı sorgusu sırasında bir hata oluştu.' });
    }
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
});
