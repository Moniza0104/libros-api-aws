require('dotenv').config();
const { createPool } = require('./db');
const { createApp } = require('./app');

async function start() {
const db = createPool();
const app = createApp({ db });
const port = Number(process.env.PORT || 3000);

const server = app.listen(port, '0.0.0.0', () => {
console.log(API de libros escuchando en el puerto ${port});
});

const shutdown = async () => {
console.log('Cerrando la aplicación...');
server.close(async () => {
await db.end();
process.exit(0);
});
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
}

start().catch((error) => {
console.error('No se pudo iniciar la API:', error.message);
process.exit(1);
});
