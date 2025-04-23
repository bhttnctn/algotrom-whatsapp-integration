const WhatsAppService = require('../services/whatsapp.service');

// Basit bir durum yönetimi için
const userStates = new Map();

async function webhookHandler(req, res) {
    try {
        // Webhook verilerini al
        const { entry } = req.body;

        if (!entry || !entry[0].changes || !entry[0].changes[0].value.messages) {
            return res.sendStatus(200);
        }

        const message = entry[0].changes[0].value.messages[0];
        const from = message.from;

        // Mesaj tipine göre işle
        if (message.type === 'text') {
            const text = message.text.body.toLowerCase();

            // Kullanıcının mevcut durumunu kontrol et
            const currentState = userStates.get(from) || 'initial';

            if (currentState === 'waiting_for_order_number') {
                // Sipariş numarası girilmişse
                if (/^\d+$/.test(text)) {
                    await WhatsAppService.sendMessage(
                        from,
                        `Sipariş #${text} durumu: İşleniyor\n` +
                        `Tahmini Teslimat: 3 gün içinde`
                    );
                    userStates.delete(from);
                } else {
                    await WhatsAppService.sendMessage(
                        from,
                        "Lütfen geçerli bir sipariş numarası girin."
                    );
                }
            } else {
                // Ana menüyü göster
                await WhatsAppService.sendInteractiveMenu(from);
            }
        } else if (message.type === 'interactive') {
            const buttonId = message.interactive.button_reply.id;

            if (buttonId === 'track_order') {
                await WhatsAppService.sendMessage(
                    from,
                    "Lütfen sipariş numaranızı girin:"
                );
                userStates.set(from, 'waiting_for_order_number');
            } else if (buttonId === 'support') {
                await WhatsAppService.sendMessage(
                    from,
                    "Destek ekibimiz en kısa sürede size dönüş yapacaktır."
                );
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
}

module.exports = webhookHandler;