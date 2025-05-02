const WhatsAppService = require('../services/whatsapp.service');
const userStates = new Map();

async function webhookHandler(req, res) {
    console.log("Webhook isteği alındı:", req.body);

    try {
        const { entry } = req.body;

        if (!entry || !entry[0].changes || !entry[0].changes[0].value.messages) {
            return res.sendStatus(200);
        }

        const message = entry[0].changes[0].value.messages[0];
        const from = message.from; // Gönderenin telefon numarası

        console.log("Mesaj:", message);
        console.log("Gönderen:", from);

        const currentState = userStates.get(from) || 'initial';

        if (message.type === 'text') {
            const text = message.text.body.trim();

            if (currentState === 'waiting_for_query_number') {
                // Kullanıcı sorgu numarasını girdi
                userStates.delete(from); // Durumu sıfırla
                await WhatsAppService.handleRepairStatusRequest(from, text); // Sorgu numarasını işle
            } else {
                // Kullanıcı başka bir mesaj gönderdi
                await WhatsAppService.sendInteractiveMenu(from); // Menü gönder
                userStates.set(from, 'waiting_for_selection');
            }
        } else if (message.type === 'interactive') {
            const buttonId = message.interactive.button_reply.id;

            switch (buttonId) {
                case '1':
                    await WhatsAppService.sendMessage(
                        from,
                        "Tamir sorgulama talebiniz hakkında yardımcı olacağım. Lütfen sorgu numarasını giriniz."
                    );
                    userStates.set(from, 'waiting_for_query_number');
                    break;
                case '2':
                    await WhatsAppService.sendMessage(
                        from,
                        "Kargo durumu sorgulama talebiniz alındı. Lütfen kargo takip numaranızı giriniz."
                    );
                    userStates.set(from, 'waiting_for_tracking_number');
                    break;
                case '3':
                    await WhatsAppService.sendMessage(
                        from,
                        "Ürün satın alma işlemi için lütfen ürün kodunu giriniz."
                    );
                    userStates.set(from, 'waiting_for_product_code');
                    break;
                case '4':
                    await WhatsAppService.sendMessage(
                        from,
                        "Raporlar talebiniz alındı. Lütfen rapor türünü belirtiniz."
                    );
                    userStates.set(from, 'waiting_for_report_type');
                    break;
                case '5':
                    await WhatsAppService.sendMessage(
                        from,
                        "Öneri ve şikayetlerinizi yazabilirsiniz. En kısa sürede size dönüş yapılacaktır."
                    );
                    userStates.set(from, 'waiting_for_feedback');
                    break;
                case '6':
                    await WhatsAppService.sendMessage(
                        from,
                        "Diğer işlemler için lütfen müşteri temsilcimizle iletişime geçiniz."
                    );
                    userStates.delete(from);
                    break;
                default:
                    await WhatsAppService.sendMessage(
                        from,
                        "Geçersiz seçim. Lütfen tekrar deneyin."
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