const app = require('./app');
const { port } = require('./config/env');
const { conectarDB, desconectarDB } = require('./config/db');
const logger = require('./config/logger');

async function main() {
  await conectarDB();

  const server = app.listen(port, (error) => {
    if (error) throw error; // p. ej. EADDRINUSE (Express 5 pasa el error al callback)
    logger.info(`Servidor escuchando en http://localhost:${port}`);
  });

  // Apagado ordenado: dejar de aceptar peticiones, terminar las activas y cerrar la BD
  const apagar = (senal) => {
    logger.info(`${senal} recibido: cerrando servidor...`);
    server.close(async () => {
      await desconectarDB();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('SIGINT', () => apagar('SIGINT'));
}

main().catch((err) => {
  logger.error('No se pudo iniciar la aplicación', { error: err.message, stack: err.stack });
  process.exit(1);
});
