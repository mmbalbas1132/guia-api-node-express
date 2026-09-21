---
title: "Enrutado (routing)"
description: "Definir rutas en Express 5: métodos HTTP, parámetros, comodines, opcionales, varios handlers y express.Router."
section: express
order: 2
level: basico
tags: [routing, rutas, parametros, router, express5]
prerequisites: [01-introduccion-e-instalacion]
tested_on: "Express 5.2 · Node.js 22"
---

# Enrutado (routing)

El **enrutado** define cómo responde la aplicación a cada *endpoint* (una combinación de ruta y método HTTP). Se hace con los métodos del objeto `app` que corresponden a los métodos HTTP.

```js
app.get('/', (req, res) => res.send('GET a la raíz'));
app.post('/', (req, res) => res.send('POST a la raíz'));
app.put('/tareas/1', (req, res) => res.send('PUT'));
app.delete('/tareas/1', (req, res) => res.send('DELETE'));
```

Cada método recibe una ruta y una función *handler* `(req, res)` que Express ejecuta cuando la petición coincide. Otros métodos útiles:

- `app.all('/ruta', handler)`: responde a **todos** los métodos HTTP.
- `app.use(handler)`: registra middleware (ver [Middleware](03-middleware.md)).

## Rutas de tipo texto

Las rutas de texto coinciden **exactamente**. El punto (`.`) y el guion (`-`) se interpretan literalmente. La *query string* (`?a=1`) no forma parte de la ruta.

```js
app.get('/', (req, res) => res.send('raíz'));
app.get('/acerca', (req, res) => res.send('acerca'));
app.get('/random.text', (req, res) => res.send('random.text'));
```

> **Aviso (Express 5):** los caracteres `? + * [] () !` están reservados y llaves `{}` marcan segmentos opcionales. Para usarlos como texto literal, escápalos con `\`.

## Expresiones regulares

```js
app.get(/a/, (req, res) => res.send('la ruta contiene una "a"'));
app.get(/.*fly$/, (req, res) => res.send('termina en fly'));   // butterfly, dragonfly…
```

## Parámetros de ruta

Los **parámetros** capturan segmentos de la URL y quedan en `req.params` (siempre como texto):

```js
app.get('/usuarios/:userId/libros/:bookId', (req, res) => {
  res.json(req.params);
});
// GET /usuarios/34/libros/8989  →  { "userId": "34", "bookId": "8989" }
```

Como `-` y `.` son literales, puedes combinarlos con parámetros:

```js
app.get('/vuelos/:desde-:hasta', (req, res) => res.json(req.params));
// GET /vuelos/LAX-SFO  →  { "desde": "LAX", "hasta": "SFO" }

app.get('/plantae/:genero.:especie', (req, res) => res.json(req.params));
// GET /plantae/Prunus.persica  →  { "genero": "Prunus", "especie": "persica" }
```

El nombre de un parámetro debe ser un identificador JavaScript válido (o ir entre comillas: `:"nombre-largo"`).

> **Aviso (Express 5):** ya **no se admiten expresiones regulares dentro de una ruta de texto**, así que `'/usuarios/:id(\\d+)'` no funciona. Valida el formato en el handler o con un middleware (por ejemplo `express-validator`), o usa un array de rutas o una regex completa.

## Comodines

Los comodines **deben tener nombre** y capturan un **array** de segmentos:

```js
app.get('/ficheros/*ruta', (req, res) => {
  // GET /ficheros/imagenes/logo.png
  console.log(req.params.ruta);          // [ 'imagenes', 'logo.png' ]
  res.send(req.params.ruta.join('/'));
});

// Para incluir también la raíz, envuelve el comodín en llaves:
app.get('/{*resto}', (req, res) => res.send('coincide con /, /foo, /foo/bar…'));
```

## Segmentos opcionales

Se marcan con llaves. Cuando el segmento no está, el parámetro no aparece en `req.params`:

```js
app.get('/:fichero{.:ext}', (req, res) => {
  // GET /imagen.png → { fichero: 'imagen', ext: 'png' }
  // GET /imagen     → { fichero: 'imagen' }
  res.json(req.params);
});

app.get('/pedido{/:id}', (req, res) => {
  // GET /pedido/42 → { id: '42' }   GET /pedido → {}
  res.json(req.params);
});
```

## Varios handlers por ruta

Puedes pasar varias funciones (o arrays de funciones). Las intermedias deben llamar a `next()` para pasar el control a la siguiente:

```js
app.get(
  '/ejemplo',
  (req, res, next) => {
    console.log('primer handler');
    next();
  },
  (req, res) => res.send('respuesta final')
);

const cb0 = (req, res, next) => { console.log('CB0'); next(); };
const cb1 = (req, res, next) => { console.log('CB1'); next(); };
app.get('/ejemplo/c', [cb0, cb1], (req, res) => res.send('C'));
```

Con `next('route')` se **salta el resto de handlers de esa ruta** y se pasa a la siguiente ruta coincidente. Sirve para imponer precondiciones:

```js
app.get('/usuario/:id', (req, res, next) => {
  if (req.params.id === '0') return next('route');
  res.send(`Usuario ${req.params.id}`);
});

app.get('/usuario/:id', (req, res) => {
  res.send('Caso especial: id 0');
});
```

> **Importante:** el **orden de registro importa**. Express evalúa las rutas en el orden en que las declaras y se detiene en la primera que responde. Coloca las rutas específicas antes que las genéricas (una ruta como `/:fichero{.:ext}` captura cualquier ruta de un solo segmento).

## Métodos de respuesta

Estos métodos de `res` **terminan** el ciclo petición-respuesta. Si el handler no llama a ninguno, el cliente se queda esperando.

| Método | Descripción |
|---|---|
| `res.send()` | Envía una respuesta de varios tipos (texto, HTML, Buffer…) |
| `res.json()` | Envía JSON |
| `res.status(código)` | Fija el código de estado (encadenable: `res.status(201).json(…)`) |
| `res.sendStatus(código)` | Fija el estado y envía su texto estándar ("Not Found", …) |
| `res.redirect()` | Redirige |
| `res.sendFile()` / `res.download()` | Envía un fichero / provoca una descarga |
| `res.render()` | Renderiza una plantilla |
| `res.end()` | Termina la respuesta sin datos |

## Rutas encadenadas con `app.route()`

Agrupa varios métodos de la misma ruta y evita repetir la ruta (y los errores tipográficos):

```js
app
  .route('/libro')
  .get((req, res) => res.send('Obtener un libro'))
  .post((req, res) => res.send('Añadir un libro'))
  .put((req, res) => res.send('Actualizar el libro'));
```

## `express.Router`: rutas modulares

Un `Router` es una **mini-aplicación** con su propio sistema de rutas y middleware, que se monta en una ruta base. Permite dividir la aplicación en módulos.

```js
// routes/pajaros.js
const express = require('express');
const router = express.Router();

// middleware específico de este router
router.use((req, res, next) => {
  console.log('Hora:', Date.now());
  next();
});

router.get('/', (req, res) => res.send('Página de pájaros'));
router.get('/acerca', (req, res) => res.send('Acerca de los pájaros'));

module.exports = router;
```

```js
// app.js
const pajaros = require('./routes/pajaros');
app.use('/pajaros', pajaros);     // responde a /pajaros y /pajaros/acerca
```

Si la ruta padre tiene parámetros (`app.use('/usuarios/:userId/tareas', tareasRouter)`), el router hijo solo los ve si se crea con `express.Router({ mergeParams: true })`.

## Puntos clave

- Un endpoint = método HTTP + ruta + handler(s).
- Express 5: comodines con nombre (`*ruta`), opcionales con llaves, sin regex dentro de rutas de texto.
- `req.params` contiene siempre texto; convierte y valida.
- Divide la app en módulos con `express.Router`.

**Siguiente:** [Middleware](03-middleware.md)
