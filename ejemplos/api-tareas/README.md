# API de gestión de tareas

Proyecto de ejemplo de la guía: una API REST con **Express 5**, **MongoDB (Mongoose 9)** y autenticación **JWT**. Cada usuario gestiona sus propias tareas; existe un rol de administrador. Incluye validación, seguridad HTTP, documentación Swagger, registros con Winston, pruebas automáticas y Docker.

La construcción, paso a paso, está explicada en la guía: [Diseño y planificación](../../08-proyecto-api-tareas/01-diseno-y-planificacion.md) · [Implementación paso a paso](../../08-proyecto-api-tareas/02-implementacion-paso-a-paso.md) · [Probar la API](../../08-proyecto-api-tareas/03-probar-la-api.md).

## Requisitos

- Node.js 22 o superior (recomendado el LTS vigente). El campo `engines` de `package.json` exige `>=20`.
- MongoDB accesible (local, Docker o Atlas) para ejecutar la API. **Las pruebas no lo necesitan** (usan una base de datos en memoria).

## Puesta en marcha

```bash
npm install
cp .env.example .env        # edita JWT_SECRET y MONGODB_URI
npm run dev                 # desarrollo (recarga al guardar)
# o bien
npm start
```

Comprueba que responde:

```bash
curl http://localhost:3000/salud
# {"estado":"ok"}
```

Documentación interactiva: <http://localhost:3000/api-docs>

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca la API (`node src/server.js`) |
| `npm run dev` | Arranca con `--watch` y carga `.env` con `--env-file` |
| `npm test` | Ejecuta las 15 pruebas (`node --test`), con MongoDB en memoria |

## Variables de entorno

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `MONGODB_URI` | Sí | — | Cadena de conexión de MongoDB |
| `JWT_SECRET` | Sí | — | Secreto para firmar los tokens (largo y aleatorio) |
| `PORT` | No | `3000` | Puerto de escucha |
| `JWT_EXPIRES_IN` | No | `1h` | Caducidad del token |
| `CORS_ORIGIN` | No | `*` | Origen permitido por CORS (en producción, el de tu frontend) |
| `LOG_LEVEL` | No | `info` | Nivel de registro de Winston |
| `LOG_DIR` | No | — | Si se define, además de la consola escribe `error.log` y `combined.log` en esa carpeta |

La aplicación no arranca si falta una variable obligatoria.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/auth/registrar` | Público |
| `POST` | `/auth/login` | Público (devuelve `{ token }`) |
| `GET` | `/tareas?page=&limit=&completada=` | Token |
| `GET` | `/tareas/:id` | Token |
| `POST` | `/tareas` | Token |
| `PUT` | `/tareas/:id` | Token |
| `DELETE` | `/tareas/:id` | Token |
| `GET` | `/usuarios` | Token con rol `admin` |
| `GET` | `/salud` | Público |
| `GET` | `/api-docs` · `/api-docs.json` | Público |

Las rutas protegidas exigen `Authorization: Bearer <token>`. El rol `admin` no se puede solicitar por la API: se asigna directamente en la base de datos.

## Estructura

```text
src/
├── config/        env.js · db.js · logger.js
├── models/        Usuario.js · Tarea.js
├── middlewares/   auth.js · validar.js · errorHandler.js
├── controllers/   authController.js · tareaController.js · usuarioController.js
├── routes/        authRoutes.js · tareaRoutes.js · usuarioRoutes.js
├── docs/          swagger.js
├── app.js         configuración de Express (sin listen)
└── server.js      arranque, apagado ordenado
tests/api.test.js
```

## Docker

```bash
export JWT_SECRET=un-secreto-largo-y-aleatorio
docker compose up -d --build       # API en :3000 y MongoDB 8
curl http://localhost:3000/salud
docker compose down                # añade -v para borrar también los datos
```

## Notas

- `node_modules`, `.env` y `logs` no se versionan (ver `.gitignore`); `package-lock.json` sí, para instalar con `npm ci`.
- Es un proyecto didáctico: antes de un uso real, revisa la lista de [preparación para producción](../../06-despliegue-y-escalabilidad/01-preparar-para-produccion.md) y limita `CORS_ORIGIN`.
