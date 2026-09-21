---
title: "Proyecto: probar la API"
description: "Cómo probar la API de tareas: flujo completo con curl y token Bearer, Swagger UI, clientes gráficos y pruebas automáticas con node:test y Supertest."
section: proyecto
order: 3
level: intermedio
tags: [pruebas, curl, postman, swagger, supertest, node-test, bearer, api-rest]
prerequisites: [02-implementacion-paso-a-paso]
tested_on: "Node.js 22 · Express 5.2 · flujo curl ejecutado contra la API real · 15 pruebas en verde"
---

# Proyecto: probar la API

Hay dos formas complementarias de comprobar que la API funciona: **a mano** (para explorar y depurar) y **automáticamente** (para que nadie rompa lo que ya funciona). Esta página cubre ambas con la API del [proyecto](02-implementacion-paso-a-paso.md); la teoría de las pruebas está en [Pruebas automatizadas](../09-calidad-y-mantenimiento/03-pruebas-automatizadas.md).

## 1. Pruebas manuales con `curl`

Arranca la API (`npm run dev` o `docker compose up`) y sigue este recorrido. Las respuestas mostradas son las obtenidas realmente; los identificadores y fechas serán distintos en tu caso. Se recomienda `-i` cuando quieras ver también el código de estado y las cabeceras.

### Registrar un usuario

```bash
curl -i -X POST http://localhost:3000/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","email":"ana@example.com","password":"secreto123"}'
```

```text
HTTP/1.1 201 Created
{"mensaje":"Usuario registrado con éxito","usuario":{"id":"6ab0d5c5…","nombre":"Ana","email":"ana@example.com","rol":"usuario"}}
```

### Iniciar sesión y guardar el token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"secreto123"}'
# {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"}
```

Guarda el token en una variable de la terminal para reutilizarlo (este ejemplo usa la herramienta `jq` para extraer el campo `token`):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"secreto123"}' | jq -r .token)
```

> **Aviso:** las rutas protegidas exigen exactamente `Authorization: Bearer <token>`. Enviar el token sin la palabra `Bearer` devuelve `401`.

### Crear, listar, modificar y borrar tareas

```bash
# Crear
curl -X POST http://localhost:3000/tareas \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"titulo":"Aprender Express","descripcion":"Leer routing"}'
```

```json
{"titulo":"Aprender Express","descripcion":"Leer routing","completada":false,
 "usuario":"6ab0d5c5…","_id":"6ab0d5c5…","createdAt":"…","updatedAt":"…","__v":0}
```

```bash
# Listar (paginado: ?page=1&limit=10) y filtrar por estado
curl "http://localhost:3000/tareas?limit=5" -H "Authorization: Bearer $TOKEN"
curl "http://localhost:3000/tareas?completada=true" -H "Authorization: Bearer $TOKEN"
```

```json
{"page":1,"limit":5,"total":1,"paginas":1,"datos":[{"_id":"6ab0d5c5…","titulo":"Aprender Express", …}]}
```

```bash
ID=<pega aquí el _id de la tarea>

# Consultar una
curl http://localhost:3000/tareas/$ID -H "Authorization: Bearer $TOKEN"

# Modificar solo un campo
curl -X PUT http://localhost:3000/tareas/$ID \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"completada":true}'

# Borrar (204 = éxito, sin cuerpo)
curl -i -X DELETE http://localhost:3000/tareas/$ID -H "Authorization: Bearer $TOKEN"
```

### Probar también los errores

Una buena batería comprueba tanto los caminos felices como los fallos. Resultados obtenidos:

| Petición | Respuesta |
|---|---|
| `GET /tareas` sin token | `401` `{"error":"Token no proporcionado"}` |
| `GET /tareas/123` (id mal formado) | `400` `{"errores":[{"msg":"Identificador no válido","path":"id",…}]}` |
| `POST /auth/registrar` con `{"email":"x"}` | `400` con un error por cada campo no válido (nombre, email y contraseña) |
| Registrar dos veces el mismo email | `409` `{"error":"El recurso ya existe"}` |
| Login con contraseña incorrecta | `401` `{"error":"Credenciales incorrectas"}` |
| `GET /usuarios` con un usuario normal | `403` `{"error":"No tienes permisos para esta acción"}` |
| `GET /nada` | `404` `{"error":"Ruta no encontrada: GET /nada"}` |
| `GET /tareas/<id de otro usuario>` | `404` (no se revela que existe) |

Para probar el rol administrador hay que promocionar a un usuario **directamente en la base de datos** (la API no lo permite a propósito):

```js
// mongosh
use api-tareas
db.usuarios.updateOne({ email: "ana@example.com" }, { $set: { rol: "admin" } })
```

Después, **inicia sesión de nuevo** para obtener un token con el nuevo rol (el rol viaja dentro del token) y `GET /usuarios` devolverá `200` con la lista, sin el campo `password`.

## 2. Swagger UI

Abre `http://localhost:3000/api-docs`: verás todos los endpoints con sus parámetros y respuestas. Pulsa **Authorize**, pega el token (solo el token, Swagger añade `Bearer`) y podrás lanzar peticiones a las rutas protegidas con **Try it out**. La especificación en bruto está en `/api-docs.json`, útil para importarla en otras herramientas.

## 3. Clientes gráficos: Postman, Insomnia, extensiones de IDE

Todos permiten lo mismo que `curl` con interfaz visual y guardar colecciones de peticiones:

1. Crea una petición `POST /auth/login` con cuerpo JSON y copia el `token` de la respuesta.
2. En las peticiones protegidas, pestaña de autorización → tipo **Bearer Token** → pega el token.
3. En `POST`/`PUT`, elige cuerpo **raw → JSON** (así se envía `Content-Type: application/json`; sin él, `req.body` llega sin datos).

Esas herramientas también importan la especificación OpenAPI de `/api-docs.json` y generan la colección completa por ti.

## 4. Pruebas automáticas con `node:test` y Supertest

Las pruebas manuales no se repiten solas. El proyecto incluye `tests/api.test.js` con **15 pruebas** que cubren autenticación, CRUD, propiedad de los datos, roles, validación, errores y documentación. Se ejecutan con:

```bash
npm test
```

Lo esencial de su diseño:

- **Ejecutor integrado de Node.js** (`node:test`) y aserciones de `node:assert/strict`: sin dependencias de pruebas.
- **Supertest** llama a la aplicación Express directamente, sin abrir un puerto (por eso `app.js` no hace `listen`).
- **MongoDB en memoria** (`mongodb-memory-server`): cada ejecución parte de una base de datos limpia y no toca datos reales. La primera vez descarga el binario de MongoDB.
- Las variables de entorno se definen **antes** de cargar la aplicación (`NODE_ENV=test` silencia los logs y desactiva el límite de intentos).
- Entre pruebas se vacían las colecciones con `deleteMany` (y **no** con `dropDatabase`: eliminaría también los índices únicos y el test del email duplicado dejaría de detectar el error).

Este es el fichero completo:

```js
// tests/api.test.js
const { describe, test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Variables de entorno necesarias ANTES de cargar la app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'secreto-de-pruebas';
process.env.MONGODB_URI = 'mongodb://placeholder'; // no se usa: la BD de pruebas es en memoria

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Usuario = require('../src/models/Usuario');

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// Se vacían las colecciones (NO dropDatabase: eliminaría también los índices únicos)
afterEach(async () => {
  const colecciones = Object.values(mongoose.connection.collections);
  await Promise.all(colecciones.map((c) => c.deleteMany({})));
});

const datos = { nombre: 'Ana', email: 'ana@example.com', password: 'secreto123' };

async function registrarYLogin(extra = {}) {
  await request(app).post('/auth/registrar').send({ ...datos, ...extra });
  const res = await request(app).post('/auth/login').send({
    email: (extra.email || datos.email),
    password: datos.password,
  });
  return res.body.token;
}

describe('Autenticación', () => {
  test('registra un usuario y no devuelve la contraseña', async () => {
    const res = await request(app).post('/auth/registrar').send(datos);
    assert.equal(res.statusCode, 201);
    assert.ok(!('password' in res.body.usuario));
    const enBD = await Usuario.findOne({ email: datos.email }).select('+password');
    assert.notEqual(enBD.password, datos.password); // está hasheada
  });

  test('rechaza datos inválidos con 400', async () => {
    const res = await request(app).post('/auth/registrar').send({ email: 'no-es-email' });
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.errores.length > 0);
  });

  test('rechaza una petición POST sin cuerpo (Express 5: req.body es undefined)', async () => {
    const res = await request(app).post('/auth/registrar');
    assert.equal(res.statusCode, 400);
  });

  test('email duplicado -> 409', async () => {
    await request(app).post('/auth/registrar').send(datos);
    const res = await request(app).post('/auth/registrar').send(datos);
    assert.equal(res.statusCode, 409);
  });

  test('login correcto devuelve un token; incorrecto, 401', async () => {
    await request(app).post('/auth/registrar').send(datos);
    const ok = await request(app).post('/auth/login').send({ email: datos.email, password: datos.password });
    assert.equal(ok.statusCode, 200);
    assert.ok(ok.body.token !== undefined);
    const mal = await request(app).post('/auth/login').send({ email: datos.email, password: 'otra-cosa' });
    assert.equal(mal.statusCode, 401);
  });

  test('JSON mal formado -> 400', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    assert.equal(res.statusCode, 400);
  });
});

describe('Tareas (CRUD protegido)', () => {
  test('sin token -> 401', async () => {
    const res = await request(app).get('/tareas');
    assert.equal(res.statusCode, 401);
  });

  test('flujo completo crear / listar / obtener / actualizar / borrar', async () => {
    const token = await registrarYLogin();
    const auth = { Authorization: `Bearer ${token}` };

    const creada = await request(app).post('/tareas').set(auth).send({ titulo: 'Aprender Express' });
    assert.equal(creada.statusCode, 201);
    const id = creada.body._id;

    const lista = await request(app).get('/tareas').set(auth);
    assert.equal(lista.body.total, 1);
    assert.equal(lista.body.datos[0].titulo, 'Aprender Express');

    const una = await request(app).get(`/tareas/${id}`).set(auth);
    assert.equal(una.statusCode, 200);

    const act = await request(app).put(`/tareas/${id}`).set(auth).send({ completada: true });
    assert.equal(act.body.completada, true);
    assert.equal(act.body.titulo, 'Aprender Express'); // los campos no enviados no se pisan

    const filtro = await request(app).get('/tareas?completada=true').set(auth);
    assert.equal(filtro.body.total, 1);

    const del = await request(app).delete(`/tareas/${id}`).set(auth);
    assert.equal(del.statusCode, 204);
    const otra = await request(app).get(`/tareas/${id}`).set(auth);
    assert.equal(otra.statusCode, 404);
  });

  test('id con formato incorrecto -> 400', async () => {
    const token = await registrarYLogin();
    const res = await request(app).get('/tareas/123').set({ Authorization: `Bearer ${token}` });
    assert.equal(res.statusCode, 400);
  });

  test('un usuario no ve las tareas de otro', async () => {
    const t1 = await registrarYLogin();
    const t2 = await registrarYLogin({ nombre: 'Luis', email: 'luis@example.com' });
    const creada = await request(app).post('/tareas').set({ Authorization: `Bearer ${t1}` }).send({ titulo: 'Privada' });
    const res = await request(app).get(`/tareas/${creada.body._id}`).set({ Authorization: `Bearer ${t2}` });
    assert.equal(res.statusCode, 404);
  });

  test('paginación', async () => {
    const token = await registrarYLogin();
    const auth = { Authorization: `Bearer ${token}` };
    for (let i = 1; i <= 5; i++) await request(app).post('/tareas').set(auth).send({ titulo: `T${i}` });
    const res = await request(app).get('/tareas?page=2&limit=2').set(auth);
    assert.equal(res.body.datos.length, 2);
    assert.equal(res.body.paginas, 3);
  });
});

describe('Roles', () => {
  test('un usuario normal recibe 403 en /usuarios y un admin, 200', async () => {
    const token = await registrarYLogin();
    const prohibido = await request(app).get('/usuarios').set({ Authorization: `Bearer ${token}` });
    assert.equal(prohibido.statusCode, 403);

    await Usuario.updateOne({ email: datos.email }, { rol: 'admin' });
    const tokenAdmin = (await request(app).post('/auth/login').send({ email: datos.email, password: datos.password })).body.token;
    const ok = await request(app).get('/usuarios').set({ Authorization: `Bearer ${tokenAdmin}` });
    assert.equal(ok.statusCode, 200);
    assert.ok(!('password' in ok.body[0]));
  });
});

describe('Otros', () => {
  test('ruta inexistente -> 404 JSON', async () => {
    const res = await request(app).get('/nada');
    assert.equal(res.statusCode, 404);
    assert.match(res.body.error, /no encontrada/i);
  });
  test('cabeceras de seguridad de Helmet presentes y sin X-Powered-By', async () => {
    const res = await request(app).get('/salud');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });
  test('la documentación OpenAPI describe los endpoints', async () => {
    const res = await request(app).get('/api-docs.json');
    assert.equal(res.statusCode, 200);
    assert.ok('/tareas' in res.body.paths);
    assert.ok('/auth/login' in res.body.paths);
    const ui = await request(app).get('/api-docs/');
    assert.equal(ui.statusCode, 200);
  });
});
```

### Resultado esperado

```text
# tests 15
# suites 4
# pass 15
# fail 0
```

### Anatomía de una prueba con Supertest

```js
const res = await request(app)             // la aplicación Express, sin listen()
  .post('/tareas')                          // método y ruta
  .set({ Authorization: `Bearer ${token}` })// cabeceras
  .send({ titulo: 'Aprender Express' });    // cuerpo JSON

assert.equal(res.statusCode, 201);          // código de estado
assert.equal(res.body.titulo, 'Aprender Express');   // cuerpo de la respuesta
```

Cada prueba sigue el patrón **preparar → actuar → comprobar**.

### Si tu API no usa base de datos: Jest + Supertest

Jest es el marco de pruebas más extendido y funciona igual de bien con Supertest cuando la aplicación no depende de una base de datos (probado con Jest 30):

```js
// app.test.js
const request = require('supertest');
const app = require('./app');

test('POST /sumar suma dos números', async () => {
  const res = await request(app).post('/sumar').send({ a: 2, b: 3 });
  expect(res.status).toBe(200);
  expect(res.body.resultado).toBe(5);
});
```

> **Aviso:** al combinar Jest 30 con Mongoose 9 y una base de datos en memoria, las pruebas fallaron en este entorno con el error `Missing required sub-document 'driver'`. Por eso el proyecto usa `node:test`. Si necesitas Jest con Mongoose, comprueba la compatibilidad de las versiones concretas que instales.

Más sobre estrategias, dobles de prueba y cobertura en [Pruebas automatizadas](../09-calidad-y-mantenimiento/03-pruebas-automatizadas.md).

## Lista de comprobación antes de dar la API por buena

- [ ] Todos los endpoints responden con el código correcto en el caso feliz.
- [ ] Cada validación devuelve `400` con un mensaje útil.
- [ ] Sin token o con token inválido/expirado: `401`. Sin permisos: `403`.
- [ ] Un usuario no puede ver ni modificar recursos de otro.
- [ ] Los errores internos devuelven un mensaje genérico (sin *stack traces*).
- [ ] La contraseña (ni su hash) aparece en ninguna respuesta.
- [ ] `npm test` en verde y `npm audit` sin vulnerabilidades graves.

## Puntos clave

- Para las rutas protegidas: `Authorization: Bearer <token>` y `Content-Type: application/json` en los cuerpos.
- Prueba los errores tanto como los aciertos.
- Supertest + `app` sin `listen()` + base de datos en memoria = pruebas rápidas y aisladas.
- Automatiza: lo que solo se prueba a mano se rompe sin que nadie lo note.

**Siguiente sección:** [Calidad y mantenimiento: documentación con Swagger](../09-calidad-y-mantenimiento/01-documentacion-con-swagger.md)
