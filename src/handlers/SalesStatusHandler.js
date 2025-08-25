class SalesStatusHandler {
	constructor({ db, sendWhatsAppMessage }) {
		this.db = db;
		this.sendWhatsAppMessage = sendWhatsAppMessage;
	}

	async onSelect(to, _msg, state) {
		state.step = 'waiting_for_sales_request_number';
		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: {
				body: '📊 *Satış Durum Sorgulama*\n\nTalebiniz hakkında sizlere yardımcı olabilmemiz için, lütfen **Satış Talep Numaranızı** giriniz.\n\n💡 *Örnek:* 793\n\n📧 Sorularınızla ilgili olarak, bize info@algotrom.com.tr adresinden e-posta gönderebilirsiniz.'
			}
		});
	}

	async onText(to, textBody, state) {
		if (state?.processID) {
			const status = await this.db.getSalesStatus(textBody);
			if (status) {
				await this.sendWhatsAppMessage(to, {
					messaging_product: 'whatsapp',
					to,
					type: 'text',
					text: { body: `📊 *Talep Durumu*\n\n🔍 **Talep No:** ${status.TalepNo}\n📈 **Durum:** ${status.SatisDurumu}`}
				});
			} else {
				await this.sendWhatsAppMessage(to, {
					messaging_product: 'whatsapp',
					to,
					type: 'text',
					text: { body: '❌ *Talep Bulunamadı*\n\nGirdiğiniz talep numarası sistemimizde bulunamadı. Lütfen numarayı kontrol edip tekrar deneyiniz.' }
				});
			}
			await this.db.saveMessage(state.processID, 'IN', 'text', textBody, 'sales_status', { talepNo: textBody }, { status: status?.SatisDurumu || null, found: Boolean(status) });
		}
		return true; 
	}
}

module.exports = SalesStatusHandler;


