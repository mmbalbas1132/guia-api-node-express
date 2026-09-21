const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const SALT_ROUNDS = 10;

// En Express 5 no hace falta try/catch: si la función async lanza un error
// o rechaza una promesa, Express lo reenvía al middleware de errores.
exports.registrar = async (req, res) => {
  const { nombre, email, password } = req.body;

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const usuario = await Usuario.create({ nombre, email, password: hash });

  res.status(201).json({
    mensaje: 'Usuario registrado con éxito',
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // El hash está oculto por defecto (select: false), hay que pedirlo
  const usuario = await Usuario.findOne({ email }).select('+password');
  const coincide = usuario && (await bcrypt.compare(password, usuario.password));

  // Mismo mensaje para "no existe" y "contraseña incorrecta": no revela qué falló
  if (!coincide) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });

  res.json({ token });
};
