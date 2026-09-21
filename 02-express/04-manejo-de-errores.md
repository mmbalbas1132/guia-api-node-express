---
title: "Manejo de errores"
description: "Cómo captura Express los errores síncronos y asíncronos, el manejador por defecto y cómo escribir manejadores de errores propios."
section: express
order: 4
level: intermedio
tags: [errores, error-handling, next, async, express5]
prerequisites: [03-middleware]
tested_on: "Express 5.2 · Node.js 22"
---

# Manejo de errores

Express incluye un manejador de errores por defecto, así que no necesitas escribir uno propio para empezar. Aun así, en una API real querrás controlar el formato y el código de las respuestas de error.

## Cómo captura Express los errores

### Código síncrono

Si el código síncrono de un handler o middleware lanza una excepción, Express la captura solo:

```js
app.get('/', (req, res) => {
  throw new Error('ROTO');       // Express lo captura y lo procesa
});
```

### Código asíncrono (recomendado: `async/await`)

En Express 5, los handlers y middleware que **devuelven una promesa** llaman automáticamente a `next(error)` si esta se rechaza o lanza. Y las funciones `async` siempre devuelven una promesa:

```js
app.get('/usuario/:id', async (req, res) => {
  const usuario = await buscarUsuario(req.params.id);   // si falla, Express lo captura
  res.json(usuario);
});
```

Si construyes una cadena de promesas en lugar de usar `async`, **devuelve la promesa** o termina con `.catch(next)`; si no, el rechazo quedaría sin manejar y podría tumbar el proceso:

```js
app.get('/', (req, res, next) => {
  Promise.resolve()
    .then(() => { throw new Error('ROTO'); })
    .catch(next);                       // los errores llegan a Express
});
```

### APIs con callbacks

Los errores de las APIs con callbacks (p. ej. `fs.readFile`) **no se lanzan**: llegan como primer argumento del callback y hay que pasarlos a `next` manualmente.

```js
app.get('/fichero', (req, res, next) => {
  fs.readFile('/no-existe', (err, datos) => {
    if (err) {
      next(err);                        // pasar el error a Express
    } else {
      res.send(datos);
    }
  });
});
```

### Otro código asíncrono sin promesas (temporizadores, eventos)

Captura tú el error dentro y pásalo a `next`. Si no, Express no lo verá y el proceso puede caerse:

```js
app.get('/', (req, res, next) => {
  setTimeout(() => {
    try {
      throw new Error('ROTO');
    } catch (err) {
      next(err);
    }
  }, 100);
});
```

Regla general: **para que la aplicación sobreviva y los manejadores de errores de Express se ejecuten, el error tiene que llegar a Express** (lanzado en código síncrono, mediante promesa rechazada devuelta, o con `next(err)`).

## El manejador de errores por defecto

Express añade uno al final de la pila. Si pasas un error a `next()` y no lo gestionas, este manejador:

- Fija `res.statusCode` a partir de `err.status` o `err.statusCode` (si el valor no está entre 400 y 599, usa 500).
- Devuelve como cuerpo el **stack trace** en desarrollo, y solo el mensaje estándar del código de estado cuando `NODE_ENV=production`.
- Incluye las cabeceras de `err.headers` si existen.

Si ya se empezó a escribir la respuesta y ocurre un error (por ejemplo durante un streaming), el manejador por defecto **cierra la conexión**. Por eso, en tu propio manejador debes delegar en él cuando las cabeceras ya se enviaron:

```js
function manejadorErrores(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Error interno' });
}
```

## Escribir manejadores de errores propios

Se definen como un middleware normal pero con **cuatro parámetros**: `(err, req, res, next)`. Deben declarar los cuatro aunque no uses `next`: es lo que permite a Express reconocerlos como manejadores de errores.

```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('¡Algo salió mal!');
});
```

Se registran **al final**, después de todas las rutas y `app.use()`:

```js
app.use(express.json());
app.use('/tareas', tareaRoutes);

// 404 para rutas no definidas (después de las rutas)
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejador de errores (el último)
app.use(manejarErrores);
```

### Varios manejadores encadenados

Puedes definir varios, cada uno con una responsabilidad. Los que no terminan la respuesta deben llamar a `next(err)`; los que sí, deben terminarla (de lo contrario, la petición se quedaría colgada):

```js
function registrarErrores(err, req, res, next) {
  console.error(err.stack);
  next(err);                                   // pasar al siguiente
}

function errorDeCliente(err, req, res, next) {
  if (req.xhr) {
    res.status(500).send({ error: 'Algo falló' });
  } else {
    next(err);
  }
}

function errorGenerico(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}

app.use(registrarErrores);
app.use(errorDeCliente);
app.use(errorGenerico);
```

## Un manejador central para una API JSON

Este patrón (usado en el [proyecto completo](../08-proyecto-api-tareas/02-implementacion-paso-a-paso.md)) traduce distintos errores a códigos de estado HTTP coherentes:

```js
// middlewares/errorHandler.js
function noEncontrado(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

function manejarErrores(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {           // JSON mal formado en el cuerpo
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (err.name === 'ValidationError') {               // validación de Mongoose
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'CastError') {                     // ObjectId o tipo inválido
    return res.status(400).json({ error: `Valor no válido para "${err.path}"` });
  }
  if (err.code === 11000) {                           // índice único duplicado en MongoDB
    return res.status(409).json({ error: 'El recurso ya existe' });
  }

  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : err.message,
  });
}

module.exports = { noEncontrado, manejarErrores };
```

> **Seguridad:** nunca envíes al cliente el *stack trace* ni mensajes internos de errores 5xx en producción; regístralos en el servidor y devuelve un mensaje genérico.

## Crear errores con código de estado

Puedes lanzar errores con `status` para que el manejador central sepa qué código usar:

```js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

app.get('/tareas/:id', async (req, res) => {
  const tarea = await Tarea.findById(req.params.id);
  if (!tarea) throw new HttpError(404, 'Tarea no encontrada');
  res.json(tarea);
});
```

## Errores que no debes «tragarte»

- No escuches `uncaughtException` para «evitar» que el proceso caiga: el estado del proceso queda impredecible. Es mejor dejar que el proceso termine y que un supervisor (systemd, Docker, PM2) lo reinicie.
- No uses el módulo `domain` (obsoleto).

## Puntos clave

- En Express 5 basta con `async/await`: los rechazos llegan al manejador de errores.
- Los manejadores de errores tienen **4 parámetros** y se registran **al final**.
- Comprueba `res.headersSent` y delega en `next(err)`.
- Distingue errores del cliente (4xx) de los del servidor (5xx) y no filtres detalles internos.

**Siguiente:** [Recibir datos y responder (req y res)](05-recibir-datos-req-res.md)
