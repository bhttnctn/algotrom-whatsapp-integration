class FaultInfoHandler {
	constructor({ db, sendWhatsAppMessage }) {
		this.db = db;
		this.sendWhatsAppMessage = sendWhatsAppMessage;
	}

	async onSelect(to, _msg, state) {
		state.step = 'waiting_for_fault_info';
		state.pendingAck = true;
		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: { body: '🔧 *Arıza Bilgisi Talebi*\n\nLütfen **tamir numarasını** veya **arıza bilgisini** giriniz.\n\nNot: İşleminizi bitirmek için lütfen "tamam" yazınız.' }
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
			await this.db.saveMessage(state.processID, 'IN', 'text', textBody, 'fault_info', { faultInfo: textBody }, { type: 'fault_info' });
			if (state.pendingAck) {
				return false;
			}
		}
		return true;
	}

	getConfirmationMessage() {
		return "✅ Arıza bildiriminiz için teşekkürler! Teknik ekibimiz talebinizi inceleyip size en kısa sürede dönüş yapacak ve bir servis randevusu oluşturacaktır. 🛠️";
	}
}

module.exports = FaultInfoHandler;


