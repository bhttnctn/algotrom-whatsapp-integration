module.exports = {
    user: 'admin',
    password: 'Alg.12345',
    server: 'algotrom.cdcoiq0akjms.eu-north-1.rds.amazonaws.com', // Örneğin: 'localhost' veya bir IP adresi
    database: 'algotrom',
    options: {
        encrypt: true, // Azure için true olmalı
        trustServerCertificate: true, // Yerel geliştirme için true olabilir
    },
};