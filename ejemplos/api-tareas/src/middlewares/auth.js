const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

// Espera la cabecera:  Authorization: Bearer <token>
function autenticar(req, res, next) {
  const cabecera = req.get('Authorization') || '';
  const [esquema, token] = cabecera.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.usuario = { id: payload.id, rol: payload.rol };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Fábrica de middleware: autorizarRoles('admin') o autorizarRoles('admin', 'editor')
function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { autenticar, autorizarRoles };
