const { validationResult } = require('express-validator');

// Se coloca DESPUÉS de las cadenas de validación de cada ruta.
module.exports = function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  next();
};
