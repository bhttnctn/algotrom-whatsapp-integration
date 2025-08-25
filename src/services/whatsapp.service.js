const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/whatsapp.config');

// Development guard: skip real API calls in development environment
const isDev = process.env.ENVIRONMENT === 'development';

// Best-effort deduplication for rapid duplicate text messages (e.g., race conditions)
const recentMessageCache = new Map(); // key -> timestamp
const DEDUPE_WINDOW_MS = 3000;

// Send a WhatsApp message with a flexible payload (text, interactive, document, etc.)
async function sendMessage(to, messagePayload) {
    if (isDev) return; // Do not call external API in development

    // Deduplicate fast duplicate text messages
    if (messagePayload?.type === 'text') {
        const body = messagePayload.text?.body?.trim() || '';
        const cacheKey = `${to}|text|${body}`;
        const now = Date.now();
        const last = recentMessageCache.get(cacheKey) || 0;
        if (now - last < DEDUPE_WINDOW_MS) {
            return; // skip duplicate
        }
        recentMessageCache.set(cacheKey, now);
    }

    const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
    try {
        const response = await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                ...messagePayload
            },
            {
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('WhatsApp API error:', error.response?.data || error.message);
        throw error;
    }
}

// Helper to create a simple text payload
function textPayload(body) {
    return { type: 'text', text: { body } };
}

// Convenience wrapper to send plain text
async function sendText(to, body) {
    return sendMessage(to, textPayload(body));
}

// Upload a media and return media ID
async function uploadMedia(buffer, mimeType, filename) {
    if (isDev) return null;
    try {
        const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/media`;
        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('file', buffer, { filename, contentType: mimeType });
        form.append('type', mimeType);

        const response = await axios.post(url, form, {
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                ...form.getHeaders()
            }
        });
        return response.data.id;
    } catch (error) {
        console.error('Media upload error:', error.response?.data || error.message);
        return null;
    }
}

module.exports = {
    sendMessage,
    sendText,
    uploadMedia
};
