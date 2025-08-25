class ReportsHandler {
	constructor({ db, sendWhatsAppMessage, uploadMedia }) {
		this.db = db;
		this.sendWhatsAppMessage = sendWhatsAppMessage;
		this.uploadMedia = uploadMedia;
	}

	async onSelect(to, _msg, state) {

		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'interactive',
			interactive: {
				type: 'list',
				body: {
					text: 'Hangi raporu almak istersiniz?'
				},
				action: {
					button: '📄 Rapor Seçenekleri',
					sections: [
						{
							title: 'Rapor Türleri',
							rows: [
								{ id: 'menu_6_1_delivery_note', title: '🚚 İrsaliye', description: 'İrsaliye bilgilerinizi öğrenin' },
								{ id: 'menu_6_2_other_reports', title: '📊 Diğer Raporlar', description: 'Gelecekteki rapor türleri' }
							]
						}
					]
				}
			}
		});
	}

}

module.exports = ReportsHandler;


