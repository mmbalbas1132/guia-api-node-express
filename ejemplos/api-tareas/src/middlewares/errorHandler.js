const logger = require('../config/logger');

// 404 para cualquier ruta no definida (se registra después de las rutas).
function noEncontrado(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

// Manejador de errores central: SIEMPRE lleva 4 parámetros y va el último.
function manejarErrores(err, req, res, next) {
  if (res.headersSent) return next(err);

  // JSON mal formado en el cuerpo de la petición
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  // Errores de validación del esquema de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  // ObjectId inválido, tipo incorrecto, etc.
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Valor no válido para "${err.path}"` });
  }
  // Clave duplicada en un índice único (p. ej. email repetido)
  if (err.code === 11000) {
    return res.status(409).json({ error: 'El recurso ya existe' });
  }

  const status = err.status || err.statusCode || 500;
  const nivel = status >= 500 ? 'error' : 'warn';      // los 4xx son problemas del cliente, no del servidor
  logger[nivel](err.message, { stack: err.stack, ruta: `${req.method} ${req.originalUrl}` });
  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : err.message,
  });
}

module.exports = { noEncontrado, manejarErrores };
