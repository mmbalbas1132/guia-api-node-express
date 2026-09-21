const { Router } = require('express');
const { body } = require('express-validator');
const validar = require('../middlewares/validar');
const { registrar, login } = require('../controllers/authController');

const router = Router();

/**
 * @openapi
 * /auth/registrar:
 *   post:
 *     summary: Registra un usuario nuevo
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password]
 *             properties:
 *               nombre: { type: string, example: Ana }
 *               email: { type: string, example: ana@example.com }
 *               password: { type: string, minLength: 8, example: secreto123 }
 *     responses:
 *       201:
 *         description: Usuario creado
 *       400:
 *         description: Datos no válidos
 *       409:
 *         description: El email ya está registrado
 */
router.post(
  '/registrar',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').trim().isEmail().withMessage('Email no válido').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  ],
  validar,
  registrar
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Inicia sesión y devuelve un token JWT
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: ana@example.com }
 *               password: { type: string, example: secreto123 }
 *     responses:
 *       200:
 *         description: Token JWT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *       401:
 *         description: Credenciales incorrectas
 */
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Email no válido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  ],
  validar,
  login
);

module.exports = router;
