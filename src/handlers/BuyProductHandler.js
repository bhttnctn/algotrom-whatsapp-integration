class BuyProductHandler {
	constructor({ db, sendWhatsAppMessage }) {
		this.db = db;
		this.sendWhatsAppMessage = sendWhatsAppMessage;
		
	}

	async onSelect(to, _msg, state) {
		state.step = 'waiting_for_product_code_or_image';
		state.pendingAck = true;
		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: {
				body: '🛒 *Ürün Satın Alma*\n\nLütfen **ürün kodunu** yazınız veya **ürün resmini** gönderiniz.\n\nNot: İşleminizi bitirmek için lütfen "tamam" yazınız.'
			}
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
			await this.db.saveMessage(state.processID, 'IN', 'text', textBody, 'product_order', { productCode: textBody }, { type: 'text' });
			if (state.pendingAck) {
				return false;
			}
		}
		return true;
	}

	async onImage(to, msg, state) {
		if (state?.processID) {
			const imageId = msg.image?.id;
			await this.db.saveMessage(state.processID, 'IN', 'image', `Ürün resmi: ${imageId}`, 'product_order', { imageId }, { type: 'image', hasImage: true });
			if (state.pendingAck) {
				return false;
			}
			// onImage ile tamamlandığında da onay mesajı gönder
			await this.sendWhatsAppMessage(to, {
				messaging_product: 'whatsapp',
				to,
				type: 'text',
				text: { body: this.getConfirmationMessage() }
			});
		}
		return true;
	}

	getConfirmationMessage() {
		return "✅ Satın alma talebiniz için teşekkürler! Talebiniz satış ekibimize iletildi. En kısa sürede sizinle fatura ve ödeme bilgileri için iletişime geçeceklerdir. 🛍️";
	}
}

module.exports = BuyProductHandler;


