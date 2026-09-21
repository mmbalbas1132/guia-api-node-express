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
