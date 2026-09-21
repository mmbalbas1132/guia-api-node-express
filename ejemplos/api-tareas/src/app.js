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
