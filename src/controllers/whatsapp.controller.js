const db = require('../services/db.service');
const whatsappService = require('../services/whatsapp.service');
// Handlers
const SalesStatusHandler = require('../handlers/SalesStatusHandler');
const BuyProductHandler = require('../handlers/BuyProductHandler');
const FaultInfoHandler = require('../handlers/FaultInfoHandler');
const CompanyInfoHandler = require('../handlers/CompanyInfoHandler');
const SuggestionComplaintHandler = require('../handlers/SuggestionComplaintHandler');
const SuggestionHandler = require('../handlers/SuggestionHandler');
const ComplaintHandler = require('../handlers/ComplaintHandler');
const ReportsHandler = require('../handlers/ReportsHandler');
const OtherHandler = require('../handlers/OtherHandler');
const DeliveryNoteHandler = require('../handlers/DeliveryNoteHandler');
const OtherReportsHandler = require('../handlers/OtherReportsHandler');

const userStates = {};
const TIMEOUT_MS = 1 * 60 * 1000;

const sendWhatsAppMessage = whatsappService.sendMessage;
const uploadMedia = whatsappService.uploadMedia;

async function sendMenu(to) {
    const menu = {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            body: { 
                text: '🎉 *Algotrom Yazılım WhatsApp Hattına Hoş Geldiniz!*\n\nLütfen yapmak istediğiniz işlemi seçiniz 👇' 
            },
            action: {
                button: '📋 Menüyü Aç',
                sections: [
                    {
                        title: '🔧 Hizmetlerimiz',
                        rows: [
                            { id: 'menu_1_sales_status', title: '📊 Satış Durum Sorgulama', description: 'Talep numaranızı öğrenin' },
                            { id: 'menu_2_buy_product', title: '🛒 Ürün Satın Almak', description: 'Ürün kodu veya resim gönderin' },
                            { id: 'menu_3_fault_info', title: '🔧 Arıza Bilgisi Talebi', description: 'Tamir numarası veya arıza bilgisi' },
                            { id: 'menu_4_company_info', title: '🏢 Firma Bilgileri', description: 'Adres, konum ve cari bilgiler' },
                            { id: 'menu_5_suggestion_complaint', title: '💬 Öneri ve Şikayet', description: 'Görüşlerinizi paylaşın' },
                            { id: 'menu_6_reports', title: '📄 Raporlar', description: 'Hangi raporu almak istersiniz?' },
                            { id: 'menu_7_other', title: '❓ Diğer', description: 'Diğer talepleriniz' }
                        ]
                    }
                ]
            }
        }
    };
    await sendWhatsAppMessage(to, menu);
}

async function sendAckMessage(to, processID) {
    const ackText = '✅ Talebiniz başarıyla alınmıştır. En kısa sürede size dönüş yapacağız.';
    await sendWhatsAppMessage(to, {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: ackText }
    });
    if (processID) {
        await db.saveMessage(processID, 'OUT', 'text', `Onay mesajı: ${ackText}`, 'ack', { acknowledged: true });
    }
}

async function initializeUserSession(whatsappNumber) {
    try {
        const userData = await db.upsertUser(whatsappNumber);
        if (!userData) return null;

        const greetingCheck = await db.shouldSendGreeting(whatsappNumber);
        
        const activeProcess = await db.getActiveProcess(userData.UserID);
        
        if (activeProcess && !greetingCheck.shouldSend) {
            return {
                userID: userData.UserID,
                processID: activeProcess.ProcessID,
                shouldSendGreeting: false
            };
        } else {
            const processID = await db.createProcess(userData.UserID);
            if (!processID) return null;
            

            await db.updateGreetingTime(whatsappNumber);
            return {
                userID: userData.UserID,
                processID: processID,
                shouldSendGreeting: true
            };
        }
    } catch (err) {
        console.error('Session initialization error:', err.message);
        return null;
    }
}

function resetState(to) {
    if (userStates[to]?.timeout) {
        clearTimeout(userStates[to].timeout);
    }
    delete userStates[to];
}

function clearFlowState(to) {
    if (!userStates[to]) return;
    userStates[to].handlerKey = null;
    userStates[to].step = null;
}

function setTimeoutForUser(to) {
    if (userStates[to]?.timeout) {
        clearTimeout(userStates[to].timeout);
    }
    userStates[to] = userStates[to] || {};
    userStates[to].timeout = setTimeout(async () => {
        const processID = userStates[to]?.processID;
        if (!processID) {
            resetState(to);
            return;
        }
        try {
            const wasProcessEndedByTimeout = await db.endProcess(processID, 'timeout');

            if (wasProcessEndedByTimeout) {

                const closingText = '⏰ *Görüşmemiz sona erdi*\n\nTeşekkür ederiz! 🙏\n\nYeni bir işlem için bize dilediğiniz zaman yazabilirsiniz. 😊';

                await db.saveMessage(
                    processID,
                    'OUT',
                    'text',
                    closingText,
                    'session_end',
                    { endedBy: 'timeout_inmemory' }
                );

                await sendWhatsAppMessage(to, {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'text',
                    text: {
                        body: closingText
                    }
                });
                console.log(`⏰ In-memory timeout message sent: ${to} (ProcessID: ${processID})`);
            } else {
                console.log(`⏰ In-memory timeout: Process ${processID} already ended, not sending duplicate message.`);
            }

            resetState(to);
        } catch (err) {
            console.error('Timeout handling error:', err.message);
            resetState(to);
        }
    }, TIMEOUT_MS);
}

async function sendTimeoutMessages() {
    try {
        const timeoutUsers = await db.getTimeoutProcessUsers();
        
        for (const user of timeoutUsers) {
            await sendWhatsAppMessage(user.WhatsAppNumber, {
                messaging_product: 'whatsapp',
                to: user.WhatsAppNumber,
                type: 'text',
                text: { 
                    body: '⏰ *Görüşmemiz sona erdi*\n\nTeşekkür ederiz! 🙏\n\nYeni bir işlem için bize dilediğiniz zaman yazabilirsiniz. 😊' 
                }
            });
            await db.saveMessage(
                user.ProcessID,
                'OUT',
                'text',
                '⏰ Görüşme sona erdi (cron)',
                'session_end',
                { endedBy: 'timeout_cron' }
            );
            
            console.log(`⏰ Timeout message sent: ${user.WhatsAppNumber} (ProcessID: ${user.ProcessID})`);
        }
    } catch (err) {
        console.error('Timeout broadcast error:', err.message);
    }
}

async function webhookHandler(req, res) {
    let data;
    try {
        data = req.body || {};
    } catch (e) {
        console.error('Request body parse error:', e.message);
        data = {};
    }

    try {
        if (data.object) {
            const messages = data.entry?.[0]?.changes?.[0]?.value?.messages;
            if (messages && messages.length > 0) {
                const msg = messages[0];
                const from = msg.from;
                const type = msg.type;

                let session;
                if (!userStates[from]) {
                    session = await initializeUserSession(from);
                    if (session) {
                        userStates[from] = {
                            userID: session.userID,
                            processID: session.processID,
                            actions: [],
                            handlerKey: null,
                            step: null
                        };
                        
                        if (session.shouldSendGreeting) {
                            await sendMenu(from);
                            // Persist menu delivery
                            await db.saveMessage(
                                session.processID,
                                'OUT',
                                'interactive',
                                'Ana menü gönderildi',
                                'menu',
                                { name: 'main_menu' }
                            );
                        }
                    }
                }

                setTimeoutForUser(from);

                // Handler registry
                const handlers = {
                    menu_1_sales_status: new SalesStatusHandler({ db, sendWhatsAppMessage, sendAckMessage }),
                    menu_2_buy_product: new BuyProductHandler({ db, sendWhatsAppMessage, sendAckMessage }),
                    menu_3_fault_info: new FaultInfoHandler({ db, sendWhatsAppMessage, sendAckMessage }),
                    menu_4_company_info: new CompanyInfoHandler({ db, sendWhatsAppMessage, sendAckMessage }),
                    menu_5_suggestion_complaint: new SuggestionComplaintHandler({ sendWhatsAppMessage }),
                    menu_5_1_suggestion: new SuggestionHandler({ db, sendWhatsAppMessage, sendAckMessage }),
                    menu_5_2_complaint: new ComplaintHandler({ db, sendWhatsAppMessage, sendAckMessage }),
                    menu_6_reports: new ReportsHandler({ db, sendWhatsAppMessage, uploadMedia, sendAckMessage }),
                    menu_6_1_delivery_note: new DeliveryNoteHandler({ db, sendWhatsAppMessage, uploadMedia }),
                    menu_6_2_other_reports: new OtherReportsHandler({ sendWhatsAppMessage }),
                    menu_7_other: new OtherHandler({ db, sendWhatsAppMessage, sendAckMessage })
                };

                if (type === 'interactive' && msg.interactive?.list_reply) {
                    const selection = msg.interactive.list_reply.id;
                    const selectionTitle = msg.interactive.list_reply.title;
                    const selectionDesc = msg.interactive.list_reply.description;
                    
                    if (userStates[from]?.processID) {
                        await db.saveMessage(
                            userStates[from].processID,
                            'IN',
                            'interactive',
                            `Menü seçimi: ${selectionTitle} (${selection})`,
                            'menu_selection',
                            { selection, title: selectionTitle, description: selectionDesc }
                        );
                    }

                    userStates[from].handlerKey = selection;
                    const handler = handlers[selection];
                    if (handler && typeof handler.onSelect === 'function') {
                        await handler.onSelect(from, msg, userStates[from]);
                    } else {
                            await sendWhatsAppMessage(from, {
                                messaging_product: 'whatsapp',
                                to: from,
                                type: 'text',
                                text: { body: '✅ Seçtiğiniz işlem kısa süre içinde uygulanacaktır.' }
                            });
                    }
                } else if (type === 'text') {
                    const textBody = msg.text.body?.trim();
                    const handlerKey = userStates[from]?.handlerKey;
                    const handler = handlerKey ? handlers[handlerKey] : null;
                    if (handler && typeof handler.onText === 'function') {
                        const completed = await handler.onText(from, textBody, userStates[from]);
                        if (completed) {

                            clearFlowState(from);
                        }
                    } else {

                        if (userStates[from]?.processID) {
                            await db.saveMessage(
                                userStates[from].processID,
                                'IN',
                                'text',
                                textBody,
                                'other',
                                { freeText: textBody },
                                { type: 'free_text' }
                            );
                        }
                    }
                } else if (type === 'image') {
                    const handlerKey = userStates[from]?.handlerKey;
                    const handler = handlerKey ? handlers[handlerKey] : null;
                    if (handler && typeof handler.onImage === 'function') {
                        const completed = await handler.onImage(from, msg, userStates[from]);
                        if (completed) {

                            clearFlowState(from);
                        }
                    } else {
                        if (userStates[from]?.processID) {
                            await db.saveMessage(
                                userStates[from].processID,
                                'IN',
                                'image',
                                `Beklenmeyen resim: ${msg.image.id}`,
                                'other',
                                { imageId: msg.image.id },
                                { type: 'unexpected_image' }
                            );
                        }
                    }
                } else {

                    if (userStates[from]?.processID) {
                        await db.saveMessage(
                            userStates[from].processID,
                            'IN',
                            type,
                            `Diğer mesaj türü: ${type}`,
                            'other',
                            { messageType: type, content: JSON.stringify(msg) },
                            { type: 'other_message_type' }
                        );
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('webhookHandler error:', err.response?.data || err.message);
        try { 
            res.sendStatus(200); 
        } catch (_) {}
    }
}

module.exports = { webhookHandler, sendMenu, sendTimeoutMessages };
