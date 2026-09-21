---
title: "Documentar la API con Swagger / OpenAPI"
description: "Generar documentación interactiva de una API Express con swagger-jsdoc y swagger-ui-express: comentarios @openapi, esquemas reutilizables y autenticación Bearer."
section: calidad
order: 1
level: intermedio
tags: [swagger, openapi, documentacion, swagger-ui, swagger-jsdoc, api-rest]
prerequisites: [06-api-rest-crud, 03-probar-la-api]
tested_on: "swagger-jsdoc 6.3 · swagger-ui-express 5.0 · OpenAPI 3.0 · Express 5.2 · comprobado en un navegador real"
---

# Documentar la API con Swagger / OpenAPI

Una API sin documentación obliga a leer el código para saber cómo usarla. **OpenAPI** es el estándar para describir APIs REST (rutas, parámetros, cuerpos, respuestas, autenticación) en un documento JSON o YAML legible por máquinas. **Swagger UI** convierte ese documento en una página interactiva en la que se pueden **probar** los endpoints desde el navegador.

Ventajas: los desarrolladores del frontend saben qué enviar y qué recibir; herramientas como Postman o los generadores de clientes importan la especificación; y la documentación sirve de contrato entre equipos.

## Paquetes

```bash
npm install swagger-jsdoc swagger-ui-express
```

- **`swagger-jsdoc`** construye la especificación OpenAPI a partir de una definición base y de **comentarios `@openapi`** escritos junto a las rutas (la documentación vive cerca del código, y es más fácil mantenerla al día).
- **`swagger-ui-express`** sirve la interfaz visual desde Express.

## Definición base y montaje

```js
// src/docs/swagger.js
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
            completada: { type: 'boolean', example: false },
          },
        },
      },
    },
  },
  apis: [rutasGlob],                           // dónde buscar los comentarios @openapi
});

module.exports = function swaggerDocs(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));   // la especificación en bruto
};
```

En `app.js`, antes de las rutas de la API:

```js
const swaggerDocs = require('./docs/swagger');
swaggerDocs(app);          // → http://localhost:3000/api-docs
```

> **Nota:** usa una ruta **absoluta** en `apis` (con `__dirname`). Una ruta relativa se interpreta desde el directorio donde arrancas el proceso y deja de funcionar si lo lanzas desde otra carpeta.

La documentación de este proyecto funciona con las cabeceras de seguridad de Helmet activadas; no hace falta desactivarlas.

## Comentarios `@openapi` en las rutas

Cada operación se describe en un comentario JSDoc justo encima de la ruta. El contenido es YAML dentro del comentario (la sangría importa):

```js
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
```

Piezas habituales:

| Elemento | Para qué |
|---|---|
| `summary` / `description` | Texto corto y explicación de la operación |
| `tags` | Agrupa los endpoints en secciones de la interfaz |
| `parameters` | Parámetros de ruta (`in: path`), de consulta (`in: query`) o cabeceras |
| `requestBody` | Cuerpo esperado (`content → application/json → schema`) |
| `responses` | Un bloque por código de estado, con su descripción y esquema |
| `security` | Qué esquema de autenticación exige (`bearerAuth`) |
| `$ref: '#/components/schemas/X'` | Reutiliza un esquema definido una sola vez |

Para las rutas del listado paginado:

```js
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
 *       401:
 *         description: Sin token o token no válido
 */
```

## Probar desde la interfaz

1. Abre `http://localhost:3000/api-docs`.
2. Ejecuta `POST /auth/login` con **Try it out** y copia el token de la respuesta.
3. Pulsa **Authorize** (candado), pega solo el token y confirma: Swagger añade `Bearer`.
4. Ejecuta el resto de operaciones; las rutas con `security` enviarán el token automáticamente.

## Buenas prácticas

- **Documenta también los errores** (`400`, `401`, `403`, `404`, `409`), no solo el éxito: son parte del contrato.
- **Reutiliza esquemas** con `$ref` para no repetir estructuras (`Tarea`, `Error`…).
- **Añade ejemplos** (`example`): hacen la interfaz mucho más útil.
- **Mantén la documentación junto al código** y actualízala en el mismo cambio que la ruta.
- **Vigílala con una prueba:** el proyecto comprueba que `/api-docs.json` contiene las rutas principales, de modo que si un comentario se rompe, el test falla.
- **En producción**, valora si la documentación debe ser pública. Una API interna suele protegerse o publicarse solo en entornos de desarrollo.

> **Alternativa:** también se puede escribir la especificación a mano (un fichero YAML/JSON) y pasarla a `swaggerUi.setup(...)`. Es más explícito, pero es más fácil que se desincronice del código.

## Puntos clave

- OpenAPI describe la API; Swagger UI la muestra y permite probarla.
- `swagger-jsdoc` genera la especificación desde comentarios `@openapi`; `swagger-ui-express` la sirve en `/api-docs`.
- Define un esquema `bearerAuth` y marca las rutas protegidas con `security`.
- Documenta respuestas de error y usa `$ref` para reutilizar esquemas.

**Siguiente:** [Logging con Winston](02-logging-con-winston.md)
