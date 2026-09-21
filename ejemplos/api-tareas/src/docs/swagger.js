const path = require('node:path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// swagger-jsdoc espera un patrón glob con '/', también en Windows: allí
// path.join usa el separador nativo y glob lo interpretaría como escape.
const rutasGlob = path.join(__dirname, '..', 'routes', '*.js').split(path.sep).join('/');

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
  apis: [rutasGlob],                           // rutas con comentarios @openapi
});

// Monta la documentación en /api-docs (y el JSON de la especificación en /api-docs.json)
module.exports = function swaggerDocs(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
};
