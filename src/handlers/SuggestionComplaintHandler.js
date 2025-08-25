class SuggestionComplaintHandler {
	constructor({ sendWhatsAppMessage }) {
		this.sendWhatsAppMessage = sendWhatsAppMessage;
	}

	async onSelect(to) {
		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'interactive',
			interactive: {
				type: 'list',
				body: { text: '💬 Lütfen aşağıdaki seçeneklerden birini seçiniz.' },
				action: {
					button: 'Seçiniz',
					sections: [
						{
							title: '💭 Öneri / Şikayet',
							rows: [
								{ id: 'menu_5_1_suggestion', title: '💡 Öneri', description: 'Önerilerinizi paylaşın' },
								{ id: 'menu_5_2_complaint', title: '⚠️ Şikayet', description: 'Şikayetlerinizi bildirin' }
							]
						}
					]
				}
			}
		});
	}
}

module.exports = SuggestionComplaintHandler;


