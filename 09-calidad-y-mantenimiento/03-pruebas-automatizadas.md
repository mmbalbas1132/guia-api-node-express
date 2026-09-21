---
title: "Pruebas automatizadas"
description: "Estrategia y práctica de testing en Node.js: pirámide de pruebas, node:test, aserciones, dobles (mocks), cobertura, pruebas de API con Supertest y comparación con Jest."
section: calidad
order: 3
level: intermedio
tags: [testing, node-test, jest, supertest, mocks, cobertura, tdd, calidad]
prerequisites: [03-probar-la-api]
tested_on: "Node.js 22 (node:test, --experimental-test-coverage) · Supertest 7.2 · Jest 30.5 (sin base de datos) · ejemplos ejecutados"
---

# Pruebas automatizadas

Una **prueba automatizada** es código que ejecuta tu código y comprueba que el resultado es el esperado. Cada cambio futuro (una nueva funcionalidad, una actualización de dependencias, un arreglo) se puede validar en segundos, sin repetir las pruebas a mano. Te da confianza para **refactorizar** y detecta regresiones antes de llegar a producción.

## Tipos de pruebas

| Tipo | Qué comprueba | Velocidad | Cuántas |
|---|---|---|---|
| **Unitarias** | Una función o módulo aislado | Muy rápidas | Muchas |
| **De integración** | Varias piezas juntas (ruta + validación + base de datos) | Medias | Bastantes |
| **De extremo a extremo (E2E)** | El sistema completo, como lo usaría un usuario | Lentas | Pocas |

Es la llamada **pirámide de pruebas**: muchas unitarias en la base, menos de integración en medio y pocas E2E arriba. En una API Express, el mayor retorno suele estar en las **pruebas de integración de las rutas** con Supertest, más unitarias para la lógica pura (cálculos, transformaciones, validadores).

## Herramientas

| Herramienta | Papel |
|---|---|
| **`node:test`** | Ejecutor de pruebas **integrado en Node.js** (sin instalar nada) |
| **`node:assert`** | Aserciones integradas (`assert.equal`, `assert.deepEqual`, `assert.throws`…) |
| **Jest** | Marco de pruebas muy extendido; incluye ejecutor, aserciones (`expect`) y mocks |
| **Supertest** | Lanza peticiones HTTP contra tu app Express sin abrir un puerto |
| **mongodb-memory-server** | MongoDB efímero en memoria para pruebas de integración |

Esta guía usa `node:test`, y el [proyecto de ejemplo](../08-proyecto-api-tareas/03-probar-la-api.md) lo emplea con Supertest y base de datos en memoria.

## `node:test` en la práctica

Función a probar (`precios.js`):

```js
function aplicarDescuento(precio, porcentaje) {
  if (precio < 0 || porcentaje < 0 || porcentaje > 100) {
    throw new RangeError('Valores fuera de rango');
  }
  return Math.round(precio * (1 - porcentaje / 100) * 100) / 100;
}

// Función con una dependencia externa inyectada (fácil de sustituir por un doble en las pruebas)
async function obtenerUsuario(id, buscar) {
  const usuario = await buscar(id);
  if (!usuario) throw new Error('Usuario no encontrado');
  return { id: usuario.id, nombre: usuario.nombre.toUpperCase() };
}

module.exports = { aplicarDescuento, obtenerUsuario };
```

Pruebas (`precios.test.js`):

```js
const { describe, test, it, mock, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { aplicarDescuento, obtenerUsuario } = require('./precios');

describe('aplicarDescuento', () => {
  test('aplica un porcentaje', () => {
    assert.equal(aplicarDescuento(100, 20), 80);
  });

  test('rechaza valores fuera de rango', () => {
    assert.throws(() => aplicarDescuento(100, 150), RangeError);
  });
});

describe('obtenerUsuario', () => {
  test('transforma el nombre y llama a la dependencia una vez', async () => {
    const buscar = mock.fn(async () => ({ id: 1, nombre: 'ana' }));   // doble de prueba
    const u = await obtenerUsuario(1, buscar);

    assert.deepEqual(u, { id: 1, nombre: 'ANA' });
    assert.equal(buscar.mock.callCount(), 1);
    assert.deepEqual(buscar.mock.calls[0].arguments, [1]);
  });

  test('lanza un error si no existe', async () => {
    await assert.rejects(obtenerUsuario(9, async () => null), /no encontrado/);
  });

  test.todo('pendiente: caso de nombres vacíos');
  test('omitida', { skip: 'motivo' }, () => {});
});

describe('hooks', () => {
  let contador;
  beforeEach(() => { contador = 0; });          // se ejecuta antes de cada prueba
  it('empieza en cero en cada prueba', () => { contador++; assert.equal(contador, 1); });
  it('sigue empezando en cero', () => { assert.equal(contador, 0); });
});
```

Ejecución:

```bash
node --test                          # busca y ejecuta los ficheros de prueba
node --test precios.test.js          # un fichero concreto
node --test --test-reporter=spec     # salida detallada, prueba a prueba
node --test --test-name-pattern="rango"    # solo las pruebas cuyo nombre coincide
node --test --watch                  # vuelve a ejecutar al guardar
```

Resumen de una ejecución real: `tests 8 · suites 3 · pass 6 · fail 0 · skipped 1 · todo 1`.

> **Nota:** sin argumentos, `node --test` busca ficheros `*.test.js` (y similares) y todo lo que esté dentro de carpetas llamadas `test`. En el proyecto de ejemplo, el script `"test": "node --test"` encuentra `tests/api.test.js`. Pasarle una **carpeta** como argumento (`node --test tests/`) no funcionó en las versiones probadas: usa el patrón sin argumento o rutas de ficheros.

### Elementos principales

| API | Uso |
|---|---|
| `describe(nombre, fn)` | Agrupa pruebas (suite) |
| `test(nombre, fn)` / `it(...)` | Define una prueba; puede ser `async` |
| `before` / `after` / `beforeEach` / `afterEach` | Preparación y limpieza (arrancar la BD, vaciar datos…) |
| `mock.fn(impl)` | Función *espía*: registra llamadas (`callCount()`, `calls`) |
| `{ skip: 'motivo' }` · `test.todo(...)` | Omitir o dejar pendiente una prueba |

Aserciones frecuentes de `node:assert/strict`: `equal`, `deepEqual`, `notEqual`, `ok`, `match` (expresión regular), `throws`, `rejects`.

## Dobles de prueba: mocks y dependencias

Una prueba unitaria no debería depender de la red, de la base de datos ni del reloj. Se sustituyen esas dependencias por **dobles**:

- **Espía (*spy*):** registra cómo se le llamó.
- **Stub:** devuelve un valor fijo.
- **Mock:** además, comprueba las llamadas esperadas.

La forma más limpia de poder sustituirlas es la **inyección de dependencias**: la función recibe lo que necesita (`buscar` en el ejemplo) en lugar de importarlo directamente. Esto conecta con [SOLID y la inversión de dependencias](../05-arquitectura/02-principios-solid.md) y con el [patrón repositorio](../05-arquitectura/04-patron-repositorio.md): si el acceso a datos está detrás de una interfaz, la lógica se prueba con un repositorio falso en memoria.

## Pruebas de API con Supertest

Supertest recibe tu `app` de Express (por eso `app.js` no debe llamar a `listen`) y permite encadenar la petición y las comprobaciones:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('./app');

test('GET /saludo/:nombre', async () => {
  const res = await request(app).get('/saludo/Ana');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { mensaje: 'Hola, Ana' });
});

test('POST /sumar valida la entrada', async () => {
  const res = await request(app).post('/sumar').send({ a: 'x' });
  assert.equal(res.status, 400);
});
```

Para rutas protegidas se añade la cabecera con `.set({ Authorization: 'Bearer ' + token })`; una función auxiliar que registre e inicie sesión (`registrarYLogin` en el proyecto) evita repetir código. Ejemplo completo con base de datos en memoria, autenticación y roles en [Probar la API](../08-proyecto-api-tareas/03-probar-la-api.md).

### Con base de datos: `mongodb-memory-server`

```js
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;
before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
afterEach(async () => {
  // Vacía los datos pero conserva los índices (dropDatabase eliminaría los índices únicos)
  const colecciones = Object.values(mongoose.connection.collections);
  await Promise.all(colecciones.map((c) => c.deleteMany({})));
});
```

Cada prueba parte de datos limpios y el orden de ejecución no importa: **las pruebas deben ser independientes**.

## Jest: la alternativa popular

Jest incluye ejecutor, `expect` y mocks. Las mismas pruebas de Supertest se escriben así (probado con Jest 30, sin base de datos):

```js
const request = require('supertest');
const app = require('./app');

describe('API de ejemplo', () => {
  test('POST /sumar suma dos números', async () => {
    const res = await request(app).post('/sumar').send({ a: 2, b: 3 });
    expect(res.status).toBe(200);
    expect(res.body.resultado).toBe(5);
  });
});
```

```json
{ "scripts": { "test": "jest" } }
```

| | `node:test` | Jest |
|---|---|---|
| Instalación | Ninguna (integrado) | `npm install -D jest` |
| Aserciones | `node:assert` | `expect(...)` con muchos *matchers* |
| Mocks | `mock.fn`, `mock.method`, `mock.timers` (esta última, experimental) | `jest.fn`, `jest.mock`, temporizadores falsos |
| Instantáneas (*snapshots*) | `t.assert.snapshot` (probado en Node.js 22; se regeneran con `--test-update-snapshots`) | Maduras |
| Ecosistema | Creciente | Muy amplio |

> **Aviso:** al combinar **Jest 30 con Mongoose 9** y una base de datos en memoria, las pruebas fallaron en este entorno con `Missing required sub-document 'driver'` (y un entorno de Jest personalizado no lo resolvió). El proyecto de ejemplo usa `node:test` por ese motivo. Si eliges Jest con Mongoose, prueba primero la combinación exacta de versiones.

## Cobertura de código

La **cobertura** indica qué porcentaje del código ejecutan las pruebas:

```bash
node --test --experimental-test-coverage
```

```text
# file            | line % | branch % | funcs % | uncovered lines
# precios.js      | 100.00 |   100.00 |  100.00 |
# all files       | 100.00 |   100.00 |   93.75 |
```

(Probado en Node.js 22, donde la opción sigue siendo experimental.) Una cobertura alta **no garantiza** pruebas buenas (se puede ejecutar una línea sin comprobar nada), pero una cobertura baja sí señala código sin vigilar. Úsala para descubrir huecos, no como objetivo en sí mismo.

## Buenas prácticas

- **Una prueba, una razón para fallar**, con un nombre que describa el comportamiento («rechaza email duplicado con 409»).
- **Patrón preparar → actuar → comprobar** (*arrange, act, assert*).
- **Independientes y repetibles:** sin depender del orden ni de datos de otras pruebas.
- **Prueba los errores y los casos límite** (vacío, negativo, muy largo, sin permisos) tanto como el camino feliz.
- **Rápidas:** las lentas se dejan de ejecutar.
- **Empieza por lo que más duele si se rompe:** autenticación, permisos, dinero, datos.
- **Ejecútalas en CI** en cada *push* (`npm ci && npm test`) antes de desplegar.
- Otra práctica es el **TDD** (*test-driven development*): escribir primero la prueba que falla, luego el código mínimo que la pasa y después refactorizar.

## Puntos clave

- Automatiza: muchas pruebas unitarias, bastantes de integración, pocas E2E.
- `node:test` + `node:assert` + Supertest cubren una API Express sin dependencias de test adicionales.
- Inyecta las dependencias para poder sustituirlas por dobles (`mock.fn`).
- Vacía datos entre pruebas con `deleteMany` para conservar índices únicos.
- La cobertura es una guía, no una meta.

**Siguiente:** [Rendimiento y caché](04-rendimiento-y-cache.md)
