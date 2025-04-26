const axios = require('axios');
const config = require('../config/whatsapp.config');

async function sendMessage(to, message) {

    console.log("Mesaj gönderiliyor:", message);

    try {
        const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
        
        const response = await axios.post(url, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { body: message }
        }, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("Mesaj gönderildi:", response.data);

        return response.data;
    } catch (error) {
        console.error('WhatsApp API Error:', error.response?.data || error);
        throw error;
    }
}

async function sendInteractiveMenu(to) {
    const menu = {
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: "Lütfen yapmak istediğiniz işlemi seçiniz:"
            },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "1", title: "Tamir durumu sorgulama" } },
                    { type: "reply", reply: { id: "2", title: "Kargo durumu sorgulama" } },
                    { type: "reply", reply: { id: "3", title: "Ürün satın alma" } },
                    { type: "reply", reply: { id: "4", title: "Raporlar" } },
                    { type: "reply", reply: { id: "5", title: "Öneri ve şikayet" } },
                    { type: "reply", reply: { id: "6", title: "Diğer" } }
                ]
            }
        }
    };

    await sendMessage(to, menu);
}

module.exports = { sendMessage, sendInteractiveMenu };