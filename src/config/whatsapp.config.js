const config = {
    apiVersion: 'v17.0',
    baseUrl: process.env.WHATSAPP_BASE_URL,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN
};

module.exports = config;