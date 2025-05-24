const express = require('express'); // Import Express framework
const sql = require('mssql');
const dbConfig = require('./src/config/db.config');
const webhookHandler = require('./src/controllers/whatsapp.controller'); // Import webhookHandler

const app = express(); // Create an Express application
const PORT = process.env.PORT || 8080; // Set the port

app.use(express.json()); // Middleware to parse JSON bodies

// Define the root route
app.get('/', (req, res) => { // async olarak tanımlandı
    console.log("Root path request received.");
    res.send(`
        <html>
            <head>
                <style>
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        font-family: Arial, sans-serif;
                        background-color: #f9f9f9;
                    }
                    .content {
                        text-align: center;
                        padding-top: 20px;
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

// Define the webhook verification route
app.get('/webhook', (req, res) => {
    console.log("Webhook verification request received.");
    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("Webhook verified!");
            res.status(200).send(challenge);
        } else {
            console.log("Invalid token or mode");
            res.status(403).send("Forbidden");
        }
    } else {
        console.log("Missing query parameters");
        res.status(400).send("Bad Request");
    }
});

// Define the webhook handling route
app.post('/webhook', async (req, res) => {
    console.log("POST /webhook endpoint invoked");

    try {
        await webhookHandler(req, res); // Call the webhookHandler function
    } catch (error) {
        console.error("Error in handlePostWebhook:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// MSSQL üzerinden tablo sorgulayan örnek GET endpoint
app.get('/db/data', async (req, res) => {
    try {
        // MSSQL bağlantısını başlat
        const pool = await sql.connect(dbConfig);

        // Tabloyu sorgula (örnek: TAMIR_TALIP_TABLOSU)
        const result = await pool.request()
            .query('SELECT * FROM GITEA.dbo.version'); // Sorguyu ihtiyacına göre değiştir

        res.json(result.recordset);
    } catch (error) {
        console.error('MSSQL Query Error:', error);
        res.status(500).json({ message: 'Veritabanı sorgusu sırasında bir hata oluştu.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});