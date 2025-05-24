module.exports = {
    user: 'GITEA',
    password: 'Gitea.2025',
    server: '10.71.49.201', // Örneğin: 'localhost' veya bir IP adresi
    port: 1433,
    database: 'GITEA',
    options: {
        encrypt: true, // Azure için true olmalı
        trustServerCertificate: true, // Yerel geliştirme için true olabilir
    },
};