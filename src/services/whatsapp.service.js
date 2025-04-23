const axios = require('axios');
const config = require('../config/whatsapp.config');

class WhatsAppService {
    static async sendMessage(to, message) {
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
            
            return response.data;
        } catch (error) {
            console.error('WhatsApp API Error:', error.response?.data || error);
            throw error;
        }
    }

    static async sendInteractiveMenu(to) {
        try {
            const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
            
            const response = await axios.post(url, {
                messaging_product: "whatsapp",
                to: to,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: "Lütfen bir seçenek belirleyin:"
                    },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: {
                                    id: "track_order",
                                    title: "Sipariş Takibi"
                                }
                            },
                            {
                                type: "reply",
                                reply: {
                                    id: "support",
                                    title: "Destek"
                                }
                            }
                        ]
                    }
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            return response.data;
        } catch (error) {
            console.error('WhatsApp API Error:', error.response?.data || error);
            throw error;
        }
    }
}

module.exports = WhatsAppService;