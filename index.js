const webhookHandler = require('./src/controllers/whatsapp.controller'); // Import webhookHandler

console.log("Lambda function initialized");

exports.handler = async (event, context, callback) => { // async olarak tanımlandı
    console.log("Lambda function invoked");

    switch (event.requestContext.routeKey) {
        case 'GET /':
            callback(null, getWARoot(event, context)); // Callback ile yanıt döndür
            break;
        case 'GET /webhook':
            callback(null, getWAWebhook(event, context)); // Callback ile yanıt döndür
            break;
        case 'POST /webhook':
            await postWAWebhook(event, callback); // POST webhook için ayrı bir method çağır
            break;
        default:
            callback(null, {
                statusCode: 404,
                body: JSON.stringify({ message: 'Not Found' }),
            });
            break;
    }
};

// Define the getWARoot function
function getWARoot(event, context) {
    console.log("Root path'e gelen doğrulama isteği alındı.");
    console.log("Root path'e gelen istek from:", event.requestContext.domainName);

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8", // HTML formatında yanıt için Content-Type
        },
        body: `
            <html>
                <head>
                    <style>
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            font-family: Arial, sans-serif;
                            background-color: #f9f9f9;
                        }
                        .content {
                            text-align: center;
                            padding-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="content">
                        <p>Bu Algotrom WhatsApp Entegrasyon uygulamasıdır.</p>
                        <p>🚀 İş Akışınızı Akıllandırın, Geleceği Şimdi Yönetin!</p>
                        <p>Algotrom ile E-Flow'la tanışın!</p>
                        <a href="https://algotrom.com.tr/" target="_blank">https://algotrom.com.tr/</a>
                    </div>
                </body>
            </html>
        `,
    };
}

// Define the getWAWebhook function
function getWAWebhook(event, context) {
    console.log("Webhook doğrulama isteği alındı.");
    console.log("Webhook path'a gelen istek from:", event.requestContext.domainName);

    const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;

    const mode = event.queryStringParameters?.["hub.mode"];
    const token = event.queryStringParameters?.["hub.verify_token"];
    const challenge = event.queryStringParameters?.["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("Webhook doğrulandı!");
            return {
                statusCode: 200,
                body: challenge,
            };
        } else {
            console.log("Invalid token or mode");
            return {
                statusCode: 403,
                body: "Forbidden",
            };
        }
    } else {
        console.log("Missing query parameters");
        return {
            statusCode: 400,
            body: "Bad Request",
        };
    }
}

// Define the postWAWebhook function
async function postWAWebhook(event, callback) {
    console.log("POST /webhook endpoint invoked");

    const body = JSON.parse(event.body || '{}'); // Lambda'dan gelen body'yi parse et
    const req = { body }; // Express-like request objesi oluştur
    const res = {
        sendStatus: (statusCode) => callback(null, { statusCode }),
        send: (body) => callback(null, { statusCode: 200, body }),
    };

    try {
        await webhookHandler(req, res); // webhookHandler fonksiyonunu çağır
    } catch (error) {
        console.error("Error in handlePostWebhook:", error);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        });
    }
}