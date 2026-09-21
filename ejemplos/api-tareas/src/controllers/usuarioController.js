const Usuario = require('../models/Usuario');

// Solo accesible para administradores (ver routes/usuarioRoutes.js)
exports.listar = async (req, res) => {
  const usuarios = await Usuario.find().sort({ createdAt: -1 }).lean();
  res.json(usuarios);
};
