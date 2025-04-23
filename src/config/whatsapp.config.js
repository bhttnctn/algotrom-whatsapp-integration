const config = {
    apiVersion: 'v17.0',
    baseUrl: process.env.WHATSAPP_BASE_URL,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_TOKEN
};

module.exports = config;