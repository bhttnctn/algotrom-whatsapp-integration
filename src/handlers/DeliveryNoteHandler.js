const db = require('../services/db.service');

class DeliveryNoteHandler {
    constructor({ db, sendWhatsAppMessage, uploadMedia }) {
        this.db = db;
        this.sendWhatsAppMessage = sendWhatsAppMessage;
        this.uploadMedia = uploadMedia;
    }

    async onSelect(to, _msg, state) {
        state.step = 'waiting_for_delivery_note_number';
        await this.sendWhatsAppMessage(to, {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: '🚚 *İrsaliye Raporu*\n\nİrsaliye raporu için lütfen **irsaliye numaranızı** giriniz.\n\n💡 *Örnek:* IRS-2024-001\n\n🔒 Güvenlik için telefon numaranız kontrol edilecektir.' }
        });
    }

    async onText(to, textBody, state) {
        const pdfBase64 = await this.db.getInvoicePDF(textBody, to);
        if (pdfBase64) {
            const buffer = Buffer.from(pdfBase64, 'base64');
            if (typeof this.uploadMedia === 'function') {
                const mediaId = await this.uploadMedia(buffer, 'application/pdf', `${textBody}-irsaliye.pdf`);
                if (mediaId) {
                    await this.sendWhatsAppMessage(to, { messaging_product: 'whatsapp', to, type: 'document', document: { id: mediaId, filename: `🚚 ${textBody}-irsaliye.pdf` } });
                }
            }
            await this.sendWhatsAppMessage(to, {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: this.getConfirmationMessage() }
            });
        } else {
            await this.sendWhatsAppMessage(to, {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: '❌ *İrsaliye Bulunamadı*\n\nGirdiğiniz irsaliye numarası sistemimizde bulunamadı veya erişim yetkiniz bulunmamaktadır. Lütfen numarayı kontrol edip tekrar deneyiniz. 🧐' }
            });
        }
        if (state?.processID) {
            await this.db.saveMessage(state.processID, 'IN', 'text', textBody, 'delivery_note', { irsaliyeNo: textBody }, { sent: Boolean(pdfBase64) });
        }
        return true;
    }

    getConfirmationMessage() {
        return "✅ Rapor talebiniz alınmıştır. İlgili birimimiz talebinizi işleme aldı. Raporunuz hazır olduğunda size bilgi verilecektir. 📊";
    }
}

module.exports = DeliveryNoteHandler;
