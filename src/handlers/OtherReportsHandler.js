class OtherReportsHandler {
    constructor({ sendWhatsAppMessage }) {
        this.sendWhatsAppMessage = sendWhatsAppMessage;
    }

    async onSelect(to, _msg, state) {
        await this.sendWhatsAppMessage(to, {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: this.getConfirmationMessage() } 
        });
        return true;
    }

    getConfirmationMessage() {
        return "✅ Rapor talebiniz alınmıştır. İlgili birimimiz talebinizi işleme aldı. Raporunuz hazır olduğunda size bilgi verilecektir. 📊";
    }
}

module.exports = OtherReportsHandler;
