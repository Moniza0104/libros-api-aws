const mysql = require('mysql2/promise');

function createPool() {
const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
throw new Error(Faltan variables de entorno: ${missing.join(', ')});
}

return mysql.createPool({
host: process.env.DB_HOST,
port: Number(process.env.DB_PORT || 3306),
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
waitForConnections: true,
connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
queueLimit: 0
});
}

module.exports = { createPool };
