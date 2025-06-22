require('dotenv').config();
const axios = require('axios');
const sql = require('mssql');
const config = require('../config/whatsapp.config');
const dbConfig = require('../config/db.config');

const isDev = process.env.ENVIRONMENT === 'development';

async function sendMessage(to, messagePayload) {
    
    if (isDev) {
        console.log("🌱 Geliştirme ortamı - Mesaj gönderimi yapılmadı:", messagePayload);
        return;
    }

    const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;

    try {
        const response = await axios.post(url, {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            ...messagePayload
        }, {
            headers: {
                'Authorization': `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("✅ Mesaj başarıyla gönderildi:", response.data);
        return response.data;
    } catch (error) {
        console.error('❌ WhatsApp API Hatası:', error.response?.data || error.message);
        throw error;
    }
}

function textPayload(body) {
    return { type: "text", text: { body } };
}

function interactiveMenuPayload() {
    return {
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: "Lütfen yapmak istediğiniz işlemi seçiniz:" },
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
}

async function sendText(to, body) {
    return sendMessage(to, textPayload(body));
}

async function sendInteractiveMenu(to) {
    return sendMessage(to, interactiveMenuPayload());
}

async function queryRepairStatus(sorguNumarasi) {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('sorguNumarasi', sql.VarChar, sorguNumarasi)
            .query('SELECT DURUM FROM TAMIR_TALIP_TABLOSU WHERE SORGU_NUMARASI = @sorguNumarasi');

        return result.recordset.length > 0
            ? result.recordset[0].DURUM
            : 'Sorgu numarasına ait bir kayıt bulunamadı.';
    } catch (error) {
        console.error('🔌 Veritabanı Hatası:', error);
        throw new Error('Veritabanı sorgusu sırasında bir hata oluştu.');
    }
}

async function handleRepairStatusRequest(to, sorguNumarasi) {
    try {
        const status = await queryRepairStatus(sorguNumarasi);
        await sendText(to, `Tamir sorgulama sonucu: ${status}`);
    } catch (error) {
        console.error('🔍 Tamir sorgusu işlenirken hata:', error);
        await sendText(to, 'Tamir durumu sorgulama sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.');
    }
}

async function handleTrackingRequest(to, trackingNumber) {
    try {
        // Örnek bir takip mesajı, gerçek entegrasyon buraya eklenebilir
        const message = `Kargo takip numaranız: ${trackingNumber}\nDurum: Kargo yolda 🚚📦`;
        await sendText(to, message);
    } catch (error) {
        console.error('Kargo durumu sorgulama hatası:', error);
        await sendText(to, 'Kargo durumu sorgulama sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
}

async function handleProductOrder(to, productCode) {
    try {
        // Örnek cevap, ürün stoğu veya fiyatı sorgulanabilir
        const message = `Ürün kodunuz: ${productCode}\nSipariş talebiniz alınmıştır. Yetkililerimiz en kısa sürede sizinle iletişime geçecektir. 🛒`;
        await sendText(to, message);
    } catch (error) {
        console.error('Ürün siparişi işleme hatası:', error);
        await sendText(to, 'Ürün satın alma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
}

async function handleReportRequest(to, reportType) {
    try {
        // Rapor üretme işlemi buraya entegre edilebilir
        const message = `Talep edilen rapor: ${reportType}\nRapor hazırlanıyor. En kısa sürede tarafınıza iletilecektir. 📄`;
        await sendText(to, message);
    } catch (error) {
        console.error('Rapor talebi hatası:', error);
        await sendText(to, 'Rapor talebi işlenirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
}

async function handleFeedback(to, feedbackMessage) {
    try {
        // Geri bildirim veritabanına kaydedilebilir
        const message = `Geri bildiriminiz için teşekkür ederiz! 💬\nMesajınız: "${feedbackMessage}"`;
        await sendText(to, message);
    } catch (error) {
        console.error('Geri bildirim hatası:', error);
        await sendText(to, 'Öneri ve şikayet gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    }
}

module.exports = {
    sendMessage,
    sendText,
    sendInteractiveMenu,
    handleRepairStatusRequest,
    handleTrackingRequest,
    handleProductOrder,
    handleReportRequest,
    handleFeedback
};
