---
title: "Proyecto: implementación paso a paso"
description: "Construcción completa de la API de tareas con Express 5, MongoDB, JWT, validación, Swagger, logs y Docker, con el código real y comprobado de cada fichero."
section: proyecto
order: 2
level: intermedio
tags: [proyecto, express, mongoose, jwt, bcrypt, validacion, seguridad, docker]
prerequisites: [01-diseno-y-planificacion]
tested_on: "Node.js 22/24 · Express 5.2.1 · Mongoose 9.10 · MongoDB 8 · 15 pruebas en verde · imagen Docker construida y ejecutada"
---

# Proyecto: implementación paso a paso

Aquí se construye la API diseñada en [la página anterior](01-diseno-y-planificacion.md). Todo el código de esta página es **el del proyecto real** ([`ejemplos/api-tareas`](../ejemplos/api-tareas/README.md)), que se ejecutó y pasó sus pruebas automáticas. Puedes ir creando los ficheros en orden o clonar el proyecto y leerlo con esta guía al lado.

> **Requisitos:** Node.js 22 o superior (recomendado el LTS vigente, la 24) y una instancia de MongoDB (local, Docker o MongoDB Atlas). Las pruebas no necesitan MongoDB: usan una base de datos en memoria.

## Paso 1. Crear el proyecto e instalar dependencias

```bash
mkdir api-tareas && cd api-tareas
npm init -y

npm install express mongoose bcrypt jsonwebtoken express-validator \
            helmet cors express-rate-limit compression winston \
            swagger-jsdoc swagger-ui-express
npm install -D supertest mongodb-memory-server

mkdir -p src/{config,models,middlewares,controllers,routes,docs} tests
```

Y en `package.json`, los scripts (`node --watch` reinicia al guardar y `--env-file` carga el `.env`, ambos integrados en Node.js):

`package.json`

```json
{
  "name": "api-tareas",
  "version": "1.0.0",
  "description": "API REST de gestión de tareas con Express 5, MongoDB y JWT",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch --env-file=.env src/server.js",
    "test": "node --test"
  },
  "engines": {
    "node": ">=20"
  },
  "license": "MIT",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "compression": "^1.8.2",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "express-rate-limit": "^8.7.0",
    "express-validator": "^7.3.2",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.10.1",
    "swagger-jsdoc": "^6.3.0",
    "swagger-ui-express": "^5.0.1",
    "winston": "^3.19.0"
  },
  "devDependencies": {
    "mongodb-memory-server": "^11.2.0",
    "supertest": "^7.2.2"
  }
}
```

> **Nota:** `npm install` fija en `package.json` versiones con `^` (compatibles). El fichero `package-lock.json` que se genera **debe versionarse** para instalaciones reproducibles con `npm ci`.

## Paso 2. Configuración

### Variables de entorno

Crea `.env` (no se versiona) a partir de esta plantilla, que **sí** se versiona como documentación:

```text
# .env.example
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/api-tareas
JWT_SECRET=cambia-esto-por-un-secreto-largo-y-aleatorio
JWT_EXPIRES_IN=1h
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
# LOG_DIR=logs        # descomenta para escribir también en logs/error.log y logs/combined.log
```

Y `.gitignore`:

```text
# .gitignore
node_modules
.env
logs
```

### Leer y validar la configuración

Si falta una variable imprescindible, es mejor **fallar al arrancar** con un mensaje claro que descubrirlo en mitad de una petición.

```js
// src/config/env.js
// Lee y valida la configuración una sola vez, al arrancar.
const requeridas = ['MONGODB_URI', 'JWT_SECRET'];

for (const nombre of requeridas) {
  if (!process.env[nombre]) {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
```

### Conexión a la base de datos

```js
// src/config/db.js
const mongoose = require('mongoose');
const { mongodbUri } = require('./env');

async function conectarDB() {
  await mongoose.connect(mongodbUri);
  console.log('MongoDB conectado');
}

async function desconectarDB() {
  await mongoose.disconnect();
}

module.exports = { conectarDB, desconectarDB };
```

Mongoose 9 no necesita las opciones antiguas (`useNewUrlParser`, `useUnifiedTopology`…): pasarlas provoca un error.

### Registros (logs)

Winston escribe en consola (lo habitual en contenedores y plataformas cloud, que recogen la salida) y, opcionalmente, en ficheros si defines `LOG_DIR`. Durante los tests se silencia. Ver [Logging con Winston](../09-calidad-y-mantenimiento/02-logging-con-winston.md).

```js
// src/config/logger.js
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
```

## Paso 3. Modelos

Dos detalles de seguridad: `select: false` en `password` (el hash no sale en las consultas) y el rol por defecto `usuario`.

```js
// src/models/Usuario.js
const { Schema, model } = require('mongoose');

const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false -> el hash nunca sale en las consultas salvo que se pida explícitamente
    password: { type: String, required: true, select: false },
    rol: { type: String, enum: ['usuario', 'admin'], default: 'usuario' },
  },
  { timestamps: true }
);

module.exports = model('Usuario', usuarioSchema);
```

```js
// src/models/Tarea.js
const { Schema, model } = require('mongoose');

const tareaSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, trim: true, default: '' },
    completada: { type: Boolean, default: false },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  },
  { timestamps: true }
);

module.exports = model('Tarea', tareaSchema);
```

## Paso 4. Middlewares

### Errores: 404 y manejador global

El manejador de errores lleva **cuatro parámetros** y se registra **el último**. Traduce los errores conocidos (JSON mal formado, validación de Mongoose, id inválido, clave duplicada) a códigos HTTP adecuados y, para cualquier otro, devuelve un mensaje genérico sin filtrar detalles internos. Ver [Manejo de errores](../02-express/04-manejo-de-errores.md).

```js
// src/middlewares/errorHandler.js
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
```

### Autenticación y autorización

`autenticar` exige la cabecera `Authorization: Bearer <token>`, verifica el JWT y deja `{ id, rol }` en `req.usuario`. `autorizarRoles(...)` es una **fábrica de middleware** que restringe por rol. Ver [JWT](../03-seguridad/02-jwt.md) y [Roles](../03-seguridad/03-autorizacion-roles.md).

```js
// src/middlewares/auth.js
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
```

### Validación

```js
// src/middlewares/validar.js
const { validationResult } = require('express-validator');

// Se coloca DESPUÉS de las cadenas de validación de cada ruta.
module.exports = function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  next();
};
```

## Paso 5. Controladores

### Autenticación

Gracias a Express 5 no hace falta `try/catch`: si una función `async` rechaza, el error llega solo al manejador global (por ejemplo, un email duplicado acaba en `409`).

```js
// src/controllers/authController.js
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
```

### Tareas

Observa que **todas** las consultas incluyen `usuario: req.usuario.id`: es lo que impide acceder a tareas ajenas (fallo conocido como IDOR).

```js
// src/controllers/tareaController.js
const Tarea = require('../models/Tarea');

exports.listar = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  // Solo las tareas del usuario autenticado
  const filtro = { usuario: req.usuario.id };
  if (req.query.completada !== undefined) {
    filtro.completada = req.query.completada === 'true';
  }

  const [datos, total] = await Promise.all([
    Tarea.find(filtro)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Tarea.countDocuments(filtro),
  ]);

  res.json({ page, limit, total, paginas: Math.ceil(total / limit), datos });
};

exports.obtener = async (req, res) => {
  const tarea = await Tarea.findOne({ _id: req.params.id, usuario: req.usuario.id });
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(tarea);
};

exports.crear = async (req, res) => {
  const { titulo, descripcion } = req.body;
  const tarea = await Tarea.create({ titulo, descripcion, usuario: req.usuario.id });
  res.status(201).json(tarea);
};

exports.actualizar = async (req, res) => {
  const { titulo, descripcion, completada } = req.body;
  const tarea = await Tarea.findOneAndUpdate(
    { _id: req.params.id, usuario: req.usuario.id },
    { titulo, descripcion, completada },
    { returnDocument: 'after', runValidators: true }
  );
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(tarea);
};

exports.eliminar = async (req, res) => {
  const tarea = await Tarea.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id });
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.status(204).end();
};
```

### Usuarios (solo administrador)

```js
// src/controllers/usuarioController.js
const Usuario = require('../models/Usuario');

// Solo accesible para administradores (ver routes/usuarioRoutes.js)
exports.listar = async (req, res) => {
  const usuarios = await Usuario.find().sort({ createdAt: -1 }).lean();
  res.json(usuarios);
};
```

## Paso 6. Rutas

Cada ruta encadena **validaciones → `validar` → controlador**. Los comentarios `@openapi` alimentan la documentación Swagger (ver [Documentación con Swagger](../09-calidad-y-mantenimiento/01-documentacion-con-swagger.md)).

```js
// src/routes/authRoutes.js
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
```

```js
// src/routes/tareaRoutes.js
const { Router } = require('express');
const { body, param } = require('express-validator');
const { autenticar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const c = require('../controllers/tareaController');

const router = Router();

// Todas las rutas de este router exigen estar autenticado
router.use(autenticar);

const idValido = param('id').isMongoId().withMessage('Identificador no válido');

/**
 * @openapi
 * /tareas:
 *   get:
 *     summary: Lista las tareas del usuario autenticado (paginadas)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: completada, schema: { type: boolean } }
 *     responses:
 *       200:
 *         description: Página de tareas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 paginas: { type: integer }
 *                 datos:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Tarea' }
 *       401:
 *         description: Sin token o token no válido
 */
router.get('/', c.listar);

/**
 * @openapi
 * /tareas/{id}:
 *   get:
 *     summary: Obtiene una tarea por su id
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: La tarea
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tarea' }
 *       404:
 *         description: No existe (o no pertenece al usuario)
 */
router.get('/:id', idValido, validar, c.obtener);

/**
 * @openapi
 * /tareas:
 *   post:
 *     summary: Crea una tarea
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TareaEntrada' }
 *     responses:
 *       201:
 *         description: Tarea creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tarea' }
 *       400:
 *         description: Datos no válidos
 */
router.post(
  '/',
  [
    body('titulo').trim().notEmpty().withMessage('El título es obligatorio'),
    body('descripcion').optional().isString().trim(),
  ],
  validar,
  c.crear
);

/**
 * @openapi
 * /tareas/{id}:
 *   put:
 *     summary: Actualiza una tarea (solo los campos enviados)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TareaEntrada' }
 *     responses:
 *       200:
 *         description: Tarea actualizada
 *       404:
 *         description: No existe
 */
router.put(
  '/:id',
  [
    idValido,
    body('titulo').optional().trim().notEmpty().withMessage('El título no puede estar vacío'),
    body('descripcion').optional().isString().trim(),
    body('completada').optional().isBoolean().withMessage('completada debe ser true o false').toBoolean(),
  ],
  validar,
  c.actualizar
);

/**
 * @openapi
 * /tareas/{id}:
 *   delete:
 *     summary: Elimina una tarea
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       204:
 *         description: Eliminada
 *       404:
 *         description: No existe
 */
router.delete('/:id', idValido, validar, c.eliminar);

module.exports = router;
```

```js
// src/routes/usuarioRoutes.js
const { Router } = require('express');
const { autenticar, autorizarRoles } = require('../middlewares/auth');
const { listar } = require('../controllers/usuarioController');

const router = Router();

router.get('/', autenticar, autorizarRoles('admin'), listar);

module.exports = router;
```

## Paso 7. Documentación OpenAPI

```js
// src/docs/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Gestión de Tareas',
      version: '1.0.0',
      description: 'Documentación de la API (Express 5, MongoDB, JWT)',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Tarea: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65f1c0a2b3c4d5e6f7a8b9c0' },
            titulo: { type: 'string', example: 'Aprender Express' },
            descripcion: { type: 'string', example: 'Leer la guía de routing' },
            completada: { type: 'boolean', example: false },
            usuario: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        TareaEntrada: {
          type: 'object',
          required: ['titulo'],
          properties: {
            titulo: { type: 'string', example: 'Aprender Express' },
            descripcion: { type: 'string' },
            completada: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  },
  apis: [__dirname + '/../routes/*.js'],       // rutas con comentarios @openapi
});

// Monta la documentación en /api-docs (y el JSON de la especificación en /api-docs.json)
module.exports = function swaggerDocs(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
};
```

## Paso 8. La aplicación (`app.js`)

El **orden** de los `app.use` es parte del diseño: seguridad y análisis del cuerpo primero, luego las rutas, después el 404 y, al final, el manejador de errores.

```js
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const { corsOrigin } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const tareaRoutes = require('./routes/tareaRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const { noEncontrado, manejarErrores } = require('./middlewares/errorHandler');
const swaggerDocs = require('./docs/swagger');

const app = express();

app.disable('x-powered-by'); // (Helmet también lo elimina)
app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(compression());
app.use(express.json({ limit: '100kb' }));

// Limita los intentos de registro/login por IP (protege frente a fuerza bruta)
const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, inténtalo más tarde' },
  skip: () => process.env.NODE_ENV === 'test',
});

app.get('/salud', (req, res) => res.json({ estado: 'ok' }));

swaggerDocs(app);                                   // documentación en /api-docs

app.use('/auth', limitadorAuth, authRoutes);
app.use('/tareas', tareaRoutes);
app.use('/usuarios', usuarioRoutes);

// El orden importa: primero rutas, luego 404, y el manejador de errores el último
app.use(noEncontrado);
app.use(manejarErrores);

// Se exporta la app SIN llamar a listen(): así Supertest puede usarla en los tests.
module.exports = app;
```

## Paso 9. El arranque (`server.js`)

Conecta con la base de datos, escucha en el puerto y, al recibir `SIGTERM`/`SIGINT` (por ejemplo, cuando Docker o el sistema detienen el proceso), deja de aceptar peticiones, espera a las que están en curso y cierra la conexión. Ver [Preparar para producción](../06-despliegue-y-escalabilidad/01-preparar-para-produccion.md).

```js
// src/server.js
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
```

## Paso 10. Ejecutar

```bash
cp .env.example .env         # edita JWT_SECRET y MONGODB_URI
npm run dev                  # desarrollo con recarga automática
# o bien
npm start                    # arranque normal
```

Comprueba que responde:

```bash
curl http://localhost:3000/salud
# {"estado":"ok"}
```

La documentación interactiva queda en `http://localhost:3000/api-docs`. Cómo probar el resto de endpoints está en [Probar la API](03-probar-la-api.md).

## Paso 11. Empaquetar con Docker

```dockerfile
# Dockerfile
FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

# Primero solo los manifiestos: así la capa de dependencias se cachea
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# La imagen oficial incluye el usuario "node" (sin privilegios de root)
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
```

```text
# .dockerignore
node_modules
npm-debug.log
.env
.git
tests
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      MONGODB_URI: mongodb://mongo:27017/api-tareas
      JWT_SECRET: ${JWT_SECRET:?define JWT_SECRET en el entorno o en un fichero .env}
    depends_on:
      - mongo

  mongo:
    image: mongo:8
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

```bash
export JWT_SECRET=un-secreto-largo-y-aleatorio
docker compose up -d --build
curl http://localhost:3000/salud
```

Explicación detallada de cada instrucción en [Docker](../06-despliegue-y-escalabilidad/03-docker.md).

## Decisiones y lecciones del proyecto

- **`app.js` no llama a `listen`.** Así los tests importan la aplicación y la ejecutan sin puerto.
- **Errores en un único sitio.** Los controladores no tienen `try/catch`; el manejador central decide el código HTTP y qué se registra.
- **Los `4xx` se registran como `warn` y los `5xx` como `error`:** un cliente que se equivoca no es una alerta del servidor.
- **CORS:** el valor por defecto `*` es cómodo para probar; en producción define `CORS_ORIGIN` con los orígenes concretos de tu frontend.
- **El rol `admin` no se puede solicitar por la API.** Se asigna con una operación directa en la base de datos (por ejemplo, desde `mongosh`: `use api-tareas` y luego `db.usuarios.updateOne({ email: "ana@example.com" }, { $set: { rol: "admin" } })`).
- **Limitación:** el limitador de peticiones guarda los contadores en memoria del proceso; con varias instancias necesitarías un almacén compartido (por ejemplo, Redis). Ver [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md).

## Puntos clave

- Estructura por capas: `config` → `models` → `middlewares` → `controllers` → `routes` → `app` → `server`.
- Toda consulta sobre tareas filtra por el usuario del token.
- Validación en la ruta, lógica en el controlador, errores en el manejador global.
- Configuración fuera del código (variables de entorno) y comprobada al arrancar.

**Siguiente:** [Probar la API](03-probar-la-api.md)
