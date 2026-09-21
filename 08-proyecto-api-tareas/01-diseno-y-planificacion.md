---
title: "Proyecto: diseño y planificación de la API de tareas"
description: "Antes de escribir código: objetivos, endpoints, modelo de datos, estructura de carpetas y decisiones de seguridad de la API de gestión de tareas que se construye en esta sección."
section: proyecto
order: 1
level: intermedio
tags: [proyecto, diseno, api-rest, endpoints, modelo-de-datos, planificacion]
prerequisites: [06-api-rest-crud, 02-jwt, 03-mongodb-mongoose, 03-patron-mvc-y-capas]
tested_on: "Node.js 22/24 · Express 5.2 · Mongoose 9 · 15 pruebas automatizadas en verde"
---

# Proyecto: diseño y planificación de la API de tareas

Esta sección reúne todo lo aprendido en una **API REST completa** de gestión de tareas. Un proyecto real empieza por pensar, no por teclear: qué debe hacer, con qué datos y con qué reglas. Este documento es ese diseño previo; el siguiente ([Implementación paso a paso](02-implementacion-paso-a-paso.md)) lo convierte en código, y el último ([Probar la API](03-probar-la-api.md)) lo comprueba.

El proyecto completo y ejecutable está en [`ejemplos/api-tareas`](../ejemplos/api-tareas/README.md).

## 1. Objetivos

Una API para que cada usuario gestione **sus propias tareas** (crear, listar, consultar, modificar y borrar), con estas condiciones:

- Los usuarios **se registran e inician sesión**; la sesión se mantiene con un **token JWT**.
- Cada usuario ve y modifica **solo sus tareas** (nunca las de otros).
- Existe un rol **administrador** con acceso a una operación restringida (listar usuarios).
- La API **valida** todo lo que recibe, **responde con errores coherentes** y está **documentada** (Swagger) y **probada** (tests automáticos).
- Se puede **empaquetar con Docker** y desplegar.

## 2. Requisitos funcionales

| Id | Requisito | Quién |
|---|---|---|
| RF1 | Registrarse con nombre, email y contraseña | Público |
| RF2 | Iniciar sesión y recibir un token | Público |
| RF3 | Crear una tarea (título obligatorio, descripción opcional) | Usuario autenticado |
| RF4 | Listar mis tareas, con paginación y filtro por estado | Usuario autenticado |
| RF5 | Consultar una tarea mía por id | Usuario autenticado |
| RF6 | Modificar una tarea mía (parcialmente) | Usuario autenticado |
| RF7 | Eliminar una tarea mía | Usuario autenticado |
| RF8 | Listar todos los usuarios | Solo administrador |
| RF9 | Consultar la documentación interactiva de la API | Público |
| RF10 | Comprobar que el servicio está vivo (`/salud`) | Público |

## 3. Requisitos no funcionales

- **Seguridad:** contraseñas con hash (bcrypt), autenticación JWT, autorización por rol y por propietario, cabeceras seguras (Helmet), CORS configurable, límite de intentos en `/auth`, límite de tamaño del cuerpo.
- **Fiabilidad:** errores centralizados sin filtrar detalles internos, apagado ordenado del servidor.
- **Mantenibilidad:** capas separadas, configuración por variables de entorno, registros (logs) estructurados.
- **Calidad:** validación de entrada, pruebas automáticas, documentación OpenAPI.

## 4. Diseño de la API (endpoints)

Recursos en plural y en minúsculas, verbos HTTP para las acciones y códigos de estado con significado (ver [API REST y CRUD](../02-express/06-api-rest-crud.md)).

| Método | Ruta | Acceso | Éxito | Errores habituales |
|---|---|---|---|---|
| `POST` | `/auth/registrar` | Público | `201` | `400` datos no válidos · `409` email ya registrado |
| `POST` | `/auth/login` | Público | `200` `{ token }` | `400` · `401` credenciales incorrectas |
| `GET` | `/tareas?page=&limit=&completada=` | Token | `200` | `401` |
| `GET` | `/tareas/:id` | Token | `200` | `400` id no válido · `401` · `404` |
| `POST` | `/tareas` | Token | `201` | `400` · `401` |
| `PUT` | `/tareas/:id` | Token | `200` | `400` · `401` · `404` |
| `DELETE` | `/tareas/:id` | Token | `204` sin cuerpo | `400` · `401` · `404` |
| `GET` | `/usuarios` | Token + rol `admin` | `200` | `401` · `403` |
| `GET` | `/salud` | Público | `200` | — |
| `GET` | `/api-docs` | Público | Interfaz Swagger UI | — |

Decisiones de diseño relevantes:

- **Un `404` también cuando la tarea es de otro usuario.** Responder `403` confirmaría que ese id existe. Con `404` no se filtra información.
- **Un único mensaje para «email inexistente» y «contraseña incorrecta»** (`401 Credenciales incorrectas`), para no revelar qué cuentas existen.
- **`PUT` parcial:** solo se modifican los campos enviados.
- **Paginación obligatoria** en el listado (por defecto 10 elementos; máximo 100) para no devolver colecciones enormes.
- **Formato de error uniforme:** `{ "error": "mensaje" }` y, para validación, `{ "errores": [...] }`.

## 5. Modelo de datos

Dos colecciones de MongoDB y una relación «un usuario tiene muchas tareas», resuelta con una **referencia** desde la tarea al usuario (ver [Modelado de datos](../04-bases-de-datos/02-modelado-de-datos.md)).

```text
Usuario                          Tarea
─────────────────────            ──────────────────────────
_id                              _id
nombre      (String, obligat.)   titulo       (String, obligat., máx. 120)
email       (único, minúsculas)  descripcion  (String, por defecto "")
password    (hash, oculto)       completada   (Boolean, por defecto false)
rol         usuario | admin      usuario      (ref → Usuario, indexado)
createdAt / updatedAt            createdAt / updatedAt
```

- `password` tiene `select: false`: el hash **no sale en ninguna consulta** salvo que se pida explícitamente (solo en el login).
- `email` es único y se guarda en minúsculas; el índice único lo garantiza a nivel de base de datos.
- `Tarea.usuario` lleva un **índice**, porque casi todas las consultas filtran por propietario.
- El rol `admin` **no se puede pedir al registrarse**; se asigna directamente en la base de datos (así nadie se autoproclama administrador).

## 6. Arquitectura y estructura de carpetas

Se usa una arquitectura por capas simple (ver [MVC y capas](../05-arquitectura/03-patron-mvc-y-capas.md)): las **rutas** reciben y validan, los **controladores** ejecutan la lógica, los **modelos** hablan con la base de datos y los **middlewares** resuelven asuntos transversales.

```text
api-tareas/
├── src/
│   ├── config/
│   │   ├── env.js            # lee y valida variables de entorno
│   │   ├── db.js             # conexión y desconexión de MongoDB
│   │   └── logger.js         # Winston
│   ├── models/
│   │   ├── Usuario.js
│   │   └── Tarea.js
│   ├── middlewares/
│   │   ├── auth.js           # autenticar (JWT) y autorizarRoles
│   │   ├── validar.js        # resultado de express-validator → 400
│   │   └── errorHandler.js   # 404 y manejador global de errores
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── tareaController.js
│   │   └── usuarioController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── tareaRoutes.js
│   │   └── usuarioRoutes.js
│   ├── docs/swagger.js       # especificación OpenAPI + Swagger UI
│   ├── app.js                # configura Express (sin llamar a listen)
│   └── server.js             # arranca: BD + listen + apagado ordenado
├── tests/api.test.js
├── Dockerfile · docker-compose.yml · .dockerignore
├── .env.example · .gitignore
└── package.json
```

> **Consejo:** separar `app.js` (configuración) de `server.js` (arranque) es lo que permite probar la aplicación con Supertest sin abrir un puerto de red.

## 7. Flujo de una petición

```text
Cliente
  │  POST /tareas  (Authorization: Bearer <token>)
  ▼
helmet → cors → compression → express.json          (seguridad y análisis del cuerpo)
  ▼
routes/tareaRoutes  →  autenticar (JWT)  →  validaciones  →  validar
  ▼
controllers/tareaController.crear  →  models/Tarea  →  MongoDB
  ▼
res.status(201).json(tarea)

Si algo falla en cualquier punto → next(error) / excepción → manejarErrores → JSON de error
```

## 8. Dependencias elegidas

| Paquete | Para qué |
|---|---|
| `express` | Framework web (versión 5) |
| `mongoose` | Modelos y acceso a MongoDB |
| `bcrypt` | Hash de contraseñas |
| `jsonwebtoken` | Emitir y verificar tokens JWT |
| `express-validator` | Validar y sanear la entrada |
| `helmet` · `cors` · `express-rate-limit` | Seguridad HTTP, orígenes permitidos y límite de intentos |
| `compression` | Comprimir las respuestas |
| `winston` | Registros estructurados |
| `swagger-jsdoc` · `swagger-ui-express` | Documentación OpenAPI interactiva |
| `supertest` · `mongodb-memory-server` *(desarrollo)* | Pruebas de la API con una base de datos en memoria |

Las pruebas usan el ejecutor integrado de Node.js (`node --test`), sin dependencias adicionales de test.

## 9. Plan de trabajo

Orden recomendado; cada paso se puede probar antes de seguir:

1. **Esqueleto:** `npm init`, dependencias, `app.js`/`server.js`, ruta `/salud`.
2. **Configuración:** variables de entorno validadas y conexión a MongoDB.
3. **Modelos** `Usuario` y `Tarea`.
4. **Autenticación:** registro y login con bcrypt y JWT.
5. **Middlewares:** `autenticar`, `autorizarRoles`, validación y errores.
6. **CRUD de tareas** con propiedad, paginación y filtro.
7. **Endurecer:** Helmet, CORS, límites y rate limiting.
8. **Calidad:** documentación Swagger, logs y pruebas.
9. **Empaquetar:** Dockerfile y Compose.

## Puntos clave

- Diseña antes de programar: requisitos, endpoints, códigos de estado y modelo de datos.
- La propiedad de los datos se garantiza **en cada consulta** (`{ _id, usuario }`), no solo con el token.
- Separa `app` de `server`, y rutas de controladores y modelos.
- Reglas de seguridad de partida: hash de contraseñas, mensajes de error que no filtran información y roles asignados solo desde el servidor.

**Siguiente:** [Implementación paso a paso](02-implementacion-paso-a-paso.md)
