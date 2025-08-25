
class SuggestionHandler {
	constructor({ db, sendWhatsAppMessage }) {
		this.db = db;
		this.sendWhatsAppMessage = sendWhatsAppMessage;
	}

	async onSelect(to, _msg, state) {
		state.step = 'waiting_for_suggestion';
		state.pendingAck = true;
		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: { body: '💡 *Öneri Gönderimi*\n\nLütfen **önerinizi** detaylı bir şekilde giriniz.\n\nNot: İşleminizi bitirmek için lütfen "tamam" yazınız.' }
		});
	}

	async onText(_to, textBody, state) {
		if (state?.processID) {
			if (state.pendingAck && textBody?.toLowerCase() === 'tamam') {
				await this.sendWhatsAppMessage(_to, {
					messaging_product: 'whatsapp',
					to: _to,
					type: 'text',
					text: { body: this.getConfirmationMessage() }
				});
				state.pendingAck = false;
				return true;
			}
			await this.db.saveMessage(state.processID, 'IN', 'text', textBody, 'feedback', { feedbackType: 'suggestion', content: textBody }, { type: 'suggestion' });
			if (state.pendingAck) {
				return false;
			}
		}
		return true;
	}

	getConfirmationMessage() {
		return "✅ Geri bildiriminiz için teşekkür ederiz. Öneriniz ekibimiz tarafından değerlendirmeye alınacaktır. Ürünümüzü geliştirmemize yardımcı olduğunuz için teşekkür ederiz. 🌟";
	}
}

module.exports = SuggestionHandler;


