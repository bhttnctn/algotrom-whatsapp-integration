const WhatsAppService = require('../services/whatsapp.service');
const userStates = new Map();

async function webhookHandler(req, res) {
    try {
        const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!message) return res.sendStatus(200);

        const from = message.from;
        const currentState = userStates.get(from) || 'initial';

        console.log("📩 Mesaj:", message);
        console.log("👤 Gönderen:", from);

        if (message.type === 'text') {
            const text = message.text.body.trim();

            switch (currentState) {
                case 'waiting_for_query_number':
                    userStates.delete(from);
                    await WhatsAppService.handleRepairStatusRequest(from, text);
                    break;

                case 'waiting_for_tracking_number':
                    userStates.delete(from);
                    await WhatsAppService.handleTrackingRequest(from, text);
                    break;

                case 'waiting_for_product_code':
                    userStates.delete(from);
                    await WhatsAppService.handlePurchaseRequest(from, text);
                    break;

                case 'waiting_for_report_type':
                    userStates.delete(from);
                    await WhatsAppService.handleReportRequest(from, text);
                    break;

                case 'waiting_for_feedback':
                    userStates.delete(from);
                    await WhatsAppService.handleFeedback(from, text);
                    break;

                default:
                    await WhatsAppService.sendInteractiveMenu(from);
                    userStates.set(from, 'waiting_for_selection');
            }

        } else if (message.type === 'interactive') {
            const buttonId = message.interactive.button_reply.id;

            const responseMap = {
                '1': {
                    message: "Tamir sorgulama talebiniz hakkında yardımcı olacağım. Lütfen sorgu numarasını giriniz.",
                    state: 'waiting_for_query_number'
                },
                '2': {
                    message: "Kargo durumu sorgulama talebiniz alındı. Lütfen kargo takip numaranızı giriniz.",
                    state: 'waiting_for_tracking_number'
                },
                '3': {
                    message: "Ürün satın alma işlemi için lütfen ürün kodunu giriniz.",
                    state: 'waiting_for_product_code'
                },
                '4': {
                    message: "Raporlar talebiniz alındı. Lütfen rapor türünü belirtiniz.",
                    state: 'waiting_for_report_type'
                },
                '5': {
                    message: "Öneri ve şikayetlerinizi yazabilirsiniz. En kısa sürede size dönüş yapılacaktır.",
                    state: 'waiting_for_feedback'
                },
                '6': {
                    message: "Diğer işlemler için lütfen müşteri temsilcimizle iletişime geçiniz.",
                    state: null
                }
            };

            const selected = responseMap[buttonId];

            if (selected) {
                await WhatsAppService.sendMessage(from, selected.message);
                if (selected.state) userStates.set(from, selected.state);
                else userStates.delete(from);
            } else {
                await WhatsAppService.sendMessage(from, "Geçersiz seçim. Lütfen tekrar deneyin.");
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        res.sendStatus(500);
    }
}

module.exports = webhookHandler;
