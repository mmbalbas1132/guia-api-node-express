const path = require('node:path');
const winston = require('winston');

const enProduccion = process.env.NODE_ENV === 'production';

const transports = [
  // Por consola: en contenedores y plataformas cloud es lo habitual (la plataforma recoge la salida)
  new winston.transports.Console({
    format: enProduccion ? winston.format.json() : winston.format.simple(),
  }),
];

// Opcional: además, ficheros (define LOG_DIR=logs, por ejemplo, en un servidor propio)
if (process.env.LOG_DIR) {
  transports.push(
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR, 'combined.log') })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  silent: process.env.NODE_ENV === 'test',           // sin ruido durante las pruebas
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
});

module.exports = logger;
