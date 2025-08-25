const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        return pool;
    })
    .catch(err => console.error('Database connection failed. Check your .env configuration.', err));

async function getVersionData() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM [dbo].[version]');
        return result.recordset;
    } catch (err) {
        console.error('SQL query error:', err);
        throw err;
    }
}

module.exports = poolPromise;
module.exports.getVersionData = getVersionData;
