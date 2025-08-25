const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const whatsappWebhook = require('./src/controllers/whatsapp.controller');
const db = require('./src/services/db.service');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.post('/webhook', whatsappWebhook.webhookHandler);

app.get('/webhook', (req, res) => {
    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verify_token) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    return res.sendStatus(400);
});

setInterval(async () => {
    try {
        const timeoutCount = await db.checkAndEndTimeoutProcesses();
        if (timeoutCount > 0) {
            console.log(`⏰ ${timeoutCount} process(es) ended due to timeout`);
        }
        if (typeof whatsappWebhook.sendTimeoutMessages === 'function') {
            await whatsappWebhook.sendTimeoutMessages();
        }
    } catch (err) {
        console.error('Timeout maintenance error:', err.message);
    }
}, 30000); 

app.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
    console.log(`⏰ Timeout monitor active (every 30s)`);
});
