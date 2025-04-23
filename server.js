const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// WhatsApp webhook doğrulama
app.get('/webhook', (req, res) => {
    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
    
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("Webhook doğrulandı!");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// WhatsApp mesaj webhook'u
app.post('/webhook', require('./src/controllers/whatsapp.controller'));

// Export the app for AWS Lambda
module.exports = app;