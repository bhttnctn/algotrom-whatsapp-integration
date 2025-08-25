class CompanyInfoHandler {
	constructor({ db, sendWhatsAppMessage }) {
		this.db = db;
		this.sendWhatsAppMessage = sendWhatsAppMessage;
	}

	async onSelect(to, _msg, state) {
		state.step = 'company_info_provided'; 
		const latEnv = process.env.COMPANY_LATITUDE;
		const lonEnv = process.env.COMPANY_LONGITUDE;
		const latNum = latEnv != null ? parseFloat(latEnv) : NaN;
		const lonNum = lonEnv != null ? parseFloat(lonEnv) : NaN;
		const hasValidCoords = Number.isFinite(latNum) && Number.isFinite(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180;
		if (hasValidCoords) {
			const latitude = Number(latNum.toFixed(6));
			const longitude = Number(lonNum.toFixed(6));
			const locationName = (process.env.COMPANY_LOCATION_NAME || 'Algotrom Yazılım ve Teknoloji').trim();
			await this.sendWhatsAppMessage(to, {
				messaging_product: 'whatsapp',
				to,
				type: 'location',
				location: {
					latitude,
					longitude,
					name: locationName,
					address: process.env.COMPANY_ADDRESS || ''
				}
			});
		} else {
			await this.sendWhatsAppMessage(to, {
				messaging_product: 'whatsapp',
				to,
				type: 'text',
				text: { body: '📍 Konum bilgisi şu an paylaşılamıyor. Lütfen adres bilgisini kullanınız.' }
			});
		}

		const companyAddress = process.env.COMPANY_ADDRESS; 
		const workingHours = process.env.COMPANY_WORKING_HOURS || 'Pazartesi-Cuma: 09:00-18:00';
		const website = process.env.COMPANY_WEBSITE || 'www.algotrom.com.tr';

		let infoMessage = `🏢 *Firma Bilgilerimiz*\n\n`;

		if (companyAddress) {
			infoMessage += `Adresimiz: ${companyAddress}\n`;
		}
		infoMessage += `Çalışma Saatlerimiz: ${workingHours}\n` +
					   `Web Sitemiz: ${website}`;

		await this.sendWhatsAppMessage(to, {
			messaging_product: 'whatsapp',
			to,
			type: 'text',
			text: { body: infoMessage }
		});

		if (process.env.COMPANY_CUSTOMER_INFO_PDF_URL) {
			await this.sendWhatsAppMessage(to, {
				messaging_product: 'whatsapp',
				to,
				type: 'document',
				document: { link: process.env.COMPANY_CUSTOMER_INFO_PDF_URL, filename: '📄 Cari_Bilgiler.pdf' }
			});
		}

		return true;
	}

	async onText(_to, textBody, state) {

		if (state?.processID) {
			await this.db.saveMessage(state.processID, 'IN', 'text', textBody, 'company_info_follow_up', { request: textBody }, { type: 'additional_query' });
		}

		return true;
	}
}

module.exports = CompanyInfoHandler;


