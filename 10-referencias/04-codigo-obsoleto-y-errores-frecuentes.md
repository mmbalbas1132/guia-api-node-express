---
title: "Código obsoleto y errores frecuentes"
description: "Patrones antiguos que siguen apareciendo en tutoriales y libros (Node.js, Express 4, Mongoose, JWT, Docker, tests) con su equivalente actual y el motivo del cambio."
section: referencias
order: 4
level: intermedio
tags: [obsoleto, migracion, errores-comunes, tutoriales-antiguos, buenas-practicas]
prerequisites: [09-express-5-novedades-y-migracion]
tested_on: "Node.js 22/24 · Express 5.2 · Mongoose 9.10 · Jest 30 (cada punto marcado como «comprobado» se ejecutó)"
---

# Código obsoleto y errores frecuentes

El ecosistema de Node.js evoluciona rápido, y **mucho material publicado sigue mostrando prácticas que ya no son las recomendadas** (o que directamente fallan con las versiones actuales). Esta página reúne los casos más habituales para que sepas reconocerlos al copiar código de un tutorial, un libro o una respuesta antigua.

> **Consejo:** ante cualquier ejemplo, comprueba **la versión** de Node.js y de cada paquete con la que se escribió. Si difiere de la tuya, contrasta con la documentación oficial ([Enlaces](02-enlaces-oficiales.md)).

## Node.js

| Antiguo | Actual | Por qué |
|---|---|---|
| `cluster.isMaster` | `cluster.isPrimary` | `isMaster` está obsoleto. Ver [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md) |
| `os.cpus().length` para contar procesos | `os.availableParallelism()` | Refleja mejor el paralelismo disponible |
| `new Buffer(n)` | `Buffer.alloc(n)`, `Buffer.from(...)` | Emite `DeprecationWarning: Buffer() is deprecated…` (comprobado) por motivos de seguridad. Ver [Streams y Buffers](../01-fundamentos/08-streams-y-buffers.md) |
| `nodemon` en desarrollo | `node --watch` | Reinicio al guardar integrado (`nodemon` sigue siendo válido). Ver [Instalación](../01-fundamentos/02-instalacion-y-entorno.md) |
| `dotenv` para leer `.env` | `node --env-file=.env` | Integrado desde Node.js 20.6 (`dotenv` sigue siendo válido y útil). Ver [Configuración](../01-fundamentos/10-configuracion-y-variables-de-entorno.md) |
| `node-fetch` o `axios` para una petición sencilla | `fetch` global | Disponible en las versiones LTS actuales. Ver [fetch](../01-fundamentos/11-fetch-cliente-http.md) |
| «No se puede usar `require()` con paquetes ESM» | Posible en versiones recientes | En Node.js recientes `require()` puede cargar ESM si el módulo no usa `await` de nivel superior. Ver [Módulos](../01-fundamentos/04-modulos-commonjs-esm.md) |
| `__dirname` en ESM | `import.meta.dirname` / `import.meta.filename` | Equivalentes ESM (Node.js 20.11+) |

## Express

Los cambios de Express 5 están detallados en [Express 5: novedades y migración](../02-express/09-express-5-novedades-y-migracion.md). Los más frecuentes en tutoriales antiguos:

| Antiguo (Express 4) | Actual (Express 5) |
|---|---|
| `app.get('*', ...)` | `app.get('/*splat', ...)` |
| `'/:id?'` (parámetro opcional) | `'{/:id}'` |
| `'/:id(\\d+)'` (regex en la ruta) | Validar con `express-validator` o en el manejador |
| `res.json(obj, 201)` · `res.send(201)` | `res.status(201).json(obj)` · `res.sendStatus(201)` |
| `res.redirect('back')` | `res.redirect(req.get('Referrer') \|\| '/')` |
| `req.param('x')` · `app.del()` | `req.params.x` / `req.query.x` / `req.body.x` · `app.delete()` |
| `try { … } catch (e) { next(e) }` en cada manejador `async` | Nada: Express 5 reenvía los rechazos al manejador de errores |
| `app.use(bodyParser.json())` | `app.use(express.json())` (integrado; no requiere paquete aparte) |
| Asumir `req.body === {}` sin cuerpo | En Express 5 es `undefined`: validar antes de desestructurar |
| Asignar a `req.query` | Es un *getter*; la asignación se pierde sin avisar (comprobado) |

## Mongoose y bases de datos

| Antiguo | Actual | Comprobado |
|---|---|---|
| `mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })` | `mongoose.connect(uri)` | Con Mongoose 9 lanza `MongoParseError: options usenewurlparser, useunifiedtopology are not supported` |
| `Model.find({}, function (err, docs) { … })` (callbacks) | `await Model.find({})` | Lanza `Model.find() no longer accepts a callback` |
| `findOneAndUpdate(f, u, { new: true })` | `{ returnDocument: 'after' }` | Con Mongoose 9 funciona, pero muestra un aviso de deprecación |
| `Model.update()`, `.remove()` | `updateOne` / `updateMany`, `deleteOne` / `deleteMany` | Métodos retirados en versiones recientes |
| Devolver el documento de usuario completo | Ocultar el hash (`select: false`) y elegir campos | Ver [Contraseñas](../03-seguridad/01-contrasenas-bcrypt.md) |
| `db.dropDatabase()` para limpiar entre pruebas | `deleteMany({})` en cada colección | `dropDatabase` elimina también los **índices únicos** y el test de email duplicado deja de fallar (comprobado) |
| Sequelize: mezclar versiones de documentación | Usar la documentación de **v6** con `sequelize@6` | La v7 tiene una API distinta. Ver [PostgreSQL y Sequelize](../04-bases-de-datos/04-postgresql-sequelize.md) |

## Autenticación y seguridad

| Antiguo | Problema | Actual |
|---|---|---|
| Leer el token directamente de `req.header('Authorization')` sin más | Rompe con el prefijo «Bearer» que envía cualquier cliente estándar | Separar el esquema y el token, exigir `Bearer` ([JWT](../03-seguridad/02-jwt.md)) |
| Secreto JWT escrito en el código o con valor por defecto | Cualquiera con el repositorio puede falsificar tokens | Variable de entorno obligatoria, validada al arrancar |
| `bcrypt.hashSync` / `compareSync` en las rutas | Bloquea el event loop | Versiones asíncronas (`await bcrypt.hash`) |
| Mensajes distintos para «usuario no existe» y «contraseña incorrecta» | Permite descubrir qué cuentas existen | Un único mensaje (`Credenciales incorrectas`) |
| Filtrar por `_id` solamente al consultar recursos de un usuario | Cualquiera con un id ajeno accede a datos ajenos (IDOR) | Filtrar también por propietario: `{ _id, usuario: req.usuario.id }` ([Roles](../03-seguridad/03-autorizacion-roles.md)) |
| `cors()` sin opciones en producción | Acepta cualquier origen | Lista explícita de orígenes ([Helmet y CORS](../03-seguridad/04-helmet-cors-y-limites.md)) |
| Mostrar `err.stack` o `err.message` internos al cliente | Filtra detalles internos | Mensaje genérico en `5xx`, detalle solo en los logs |
| Aceptar cualquier `req.body` directamente en una consulta de Mongo | Inyección de operadores NoSQL (`{"$ne": null}`) | Validar y sanear la entrada ([Sanitización](../03-seguridad/05-sanitizacion-y-validacion-entrada.md)) |

## Tiempo real

| Error frecuente | Corrección |
|---|---|
| Abrir el `index.html` del chat con doble clic (protocolo `file://`) | Servirlo desde Express (`express.static`): el cliente de Socket.io se sirve desde el propio servidor ([WebSockets](../07-tiempo-real/01-websockets-y-socketio.md)) |
| Confiar en que `io.emit` llegue a clientes de otras instancias | Con varias instancias hacen falta *sticky sessions* y un adaptador compartido (Redis) |

## Despliegue y contenedores

| Antiguo | Actual |
|---|---|
| `FROM node:18-alpine` (o cualquier versión ya fuera de soporte) | Una versión LTS vigente y con etiqueta fija (`node:24-slim`). Ver [Docker](../06-despliegue-y-escalabilidad/03-docker.md) |
| `RUN npm install` en la imagen | `RUN npm ci --omit=dev` (reproducible y sin dependencias de desarrollo) |
| Ejecutar el contenedor como `root` | `USER node` |
| `CMD ["npm", "start"]` | `CMD ["node", "src/server.js"]`: `node` recibe directamente `SIGTERM` y puede apagarse de forma ordenada |
| Copiar `.env` a la imagen | Variables de entorno en tiempo de ejecución; `.env` en `.dockerignore` |
| Contar con un plan gratuito de Heroku | Ya no existe: revisa los planes vigentes ([Plataformas](../06-despliegue-y-escalabilidad/02-plataformas-de-despliegue.md)) |
| `docker-compose` con `version: '3'` | El campo `version` ya no es necesario en Compose actual |
| Suponer que `depends_on` espera a que MongoDB esté listo | Solo ordena el arranque: usa healthchecks o reintentos |

## Pruebas

| Error frecuente | Corrección |
|---|---|
| Jest 30 con Mongoose 9 y MongoDB en memoria | Falló con `Missing required sub-document 'driver'` en las pruebas realizadas; el proyecto usa `node:test`. Ver [Pruebas automatizadas](../09-calidad-y-mantenimiento/03-pruebas-automatizadas.md) |
| `node --test tests/` (carpeta como argumento) | Usar `node --test` sin argumento o rutas de ficheros |
| Que la aplicación haga `listen()` al importarla | Separar `app.js` de `server.js` para poder usar Supertest |
| Pruebas que dependen unas de otras | Datos limpios antes de cada prueba y sin depender del orden |

## Cómo detectarlo tú mismo

1. **Lee los avisos** de la consola: `DeprecationWarning`, avisos de Mongoose, etc. Con `node --trace-deprecation` ves de dónde vienen.
2. **`npm outdated`** y **`npm audit`** ([Mantenimiento](../09-calidad-y-mantenimiento/05-mantenimiento-y-buenas-practicas.md)).
3. **Arranca en una versión actual** y ejecuta las pruebas: los métodos eliminados fallan al momento.
4. **Busca la fecha** del tutorial y la versión de las dependencias en su `package.json`.

## Puntos clave

- Antes de copiar código, comprueba la versión con la que se escribió.
- Los cambios que más rompen: sintaxis de rutas de Express 5, opciones y callbacks de Mongoose, `Bearer` en JWT y versiones de Node.js ya sin soporte.
- Los avisos de deprecación son una advertencia con fecha: atiéndelos.

**Fin de la guía.** Vuelve al [índice](../README.md) para elegir la siguiente lectura.
