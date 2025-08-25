
class OtherHandler {
	constructor({ db, sendWhatsAppMessage }) {
		this.db = db;
		this.sendWhatsAppMessage = sendWhatsAppMessage;
	}

	async onSelect(to, _msg, state) {
		state.step = 'waiting_for_other';
		state.pendingAck = true;
		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: { body: '❓ *Diğer Talepler*\n\nLütfen **talep detaylarınızı** giriniz.\n\nNot: İşleminizi bitirmek için lütfen "tamam" yazınız.' }
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
			await this.db.saveMessage(state.processID, 'IN', 'text', textBody, 'other', { request: textBody }, { type: 'other' });
			if (state.pendingAck) {
				return false;
			}
		}
		return true;
	}

	getConfirmationMessage() {
		return "✅ Talebiniz için teşekkürler! İlgili departmanımıza yönlendirilmiştir. En kısa sürede size dönüş sağlanacaktır. 💬";
	}
}

module.exports = OtherHandler;


