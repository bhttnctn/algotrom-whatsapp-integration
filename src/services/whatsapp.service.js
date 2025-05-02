const axios = require('axios');
const config = require('../config/whatsapp.config');
const dbConfig = require('../config/db.config');
const sql = require('mssql');

async function sendMessage(to, message) {
    console.log("Mesaj gönderiliyor:", message);

    try {
        const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;

        const response = await axios.post(url, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: { body: message }
        }, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Mesaj gönderildi:", response.data);

        return response.data;
    } catch (error) {
        console.error('WhatsApp API Error:', error.response?.data || error);
        throw error;
    }
}

async function sendInteractiveMenu(to) {
    const menu = {
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: "Lütfen yapmak istediğiniz işlemi seçiniz:"
            },
            action: {
                buttons: [
                    { type: "reply", reply: { id: "1", title: "Tamir durumu sorgulama" } },
                    { type: "reply", reply: { id: "2", title: "Kargo durumu sorgulama" } },
                    { type: "reply", reply: { id: "3", title: "Ürün satın alma" } },
                    { type: "reply", reply: { id: "4", title: "Raporlar" } },
                    { type: "reply", reply: { id: "5", title: "Öneri ve şikayet" } },
                    { type: "reply", reply: { id: "6", title: "Diğer" } }
                ]
            }
        }
    };

    await sendMessage(to, menu);
}

async function queryRepairStatus(sorguNumarasi) {
    try {
        // MSSQL bağlantısını başlat
        const pool = await sql.connect(dbConfig);

        // Sorguyu çalıştır
        const result = await pool.request()
            .input('sorguNumarasi', sql.VarChar, sorguNumarasi) // Parametreyi bağla
            .query('SELECT DURUM FROM TAMIR_TALIP_TABLOSU WHERE SORGU_NUMARASI = @sorguNumarasi');

        // Sonuçları kontrol et
        if (result.recordset.length > 0) {
            return result.recordset[0].DURUM; // DURUM sütunundaki değeri döndür
        } else {
            return 'Sorgu numarasına ait bir kayıt bulunamadı.';
        }
    } catch (error) {
        console.error('MSSQL Query Error:', error);
        throw new Error('Veritabanı sorgusu sırasında bir hata oluştu.');
    }
}

async function handleRepairStatusRequest(to, sorguNumarasi) {
    try {
        const status = await queryRepairStatus(sorguNumarasi); // Veritabanından durumu al
        const message = `Tamir sorgulama sonucu: ${status}`;
        await sendMessage(to, message); // Müşteriye sonucu gönder
    } catch (error) {
        console.error('Error handling repair status request:', error);
        await sendMessage(to, 'Tamir durumu sorgulama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.');
    }
}

module.exports = { sendMessage, sendInteractiveMenu, handleRepairStatusRequest };