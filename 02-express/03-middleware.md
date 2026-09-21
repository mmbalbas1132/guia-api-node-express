---
title: "Middleware"
description: "Qué es un middleware, tipos (aplicación, router, errores, integrado, terceros), orden de ejecución y cómo escribir el tuyo."
section: express
order: 3
level: intermedio
tags: [middleware, next, express, orden, terceros]
prerequisites: [02-routing]
tested_on: "Express 5.2 · Node.js 22"
---

# Middleware

Una aplicación Express es, en esencia, **una serie de llamadas a funciones middleware** durante el ciclo petición-respuesta. Un middleware es una función con acceso a:

- el objeto de la petición (`req`),
- el objeto de la respuesta (`res`),
- y la función `next`, que pasa el control al siguiente middleware.

Un middleware puede: ejecutar cualquier código, modificar `req` y `res`, **terminar** el ciclo (enviando una respuesta) o **llamar a `next()`**. Si no termina el ciclo, **debe** llamar a `next()`; de lo contrario, la petición se queda colgada.

```text
Petición ─► [logger] ─► [parseo JSON] ─► [autenticación] ─► [handler de la ruta] ─► Respuesta
               │next()        │next()           │next()                │res.json()
```

## Tu primer middleware

```js
const express = require('express');
const app = express();

const miLogger = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();                      // sin esto, la petición no avanza
};

app.use(miLogger);             // se ejecuta en TODAS las peticiones

app.get('/', (req, res) => res.send('Hola'));
```

> **El orden importa.** Los middleware se ejecutan en el orden en que se registran. Si registras `miLogger` **después** de una ruta que ya responde, esa petición nunca llegará a él.

## Tipos de middleware

### 1. A nivel de aplicación

Se enlazan al objeto `app` con `app.use()` y `app.METHOD()`.

```js
// Sin ruta: todas las peticiones
app.use((req, res, next) => {
  console.log('Hora:', Date.now());
  next();
});

// Con ruta: cualquier método en /usuario/:id
app.use('/usuario/:id', (req, res, next) => {
  console.log('Tipo de petición:', req.method);
  next();
});

// Solo GET, con una sub-pila de varias funciones
app.get(
  '/usuario/:id',
  (req, res, next) => {
    console.log('ID:', req.params.id);
    next();
  },
  (req, res) => res.send('Datos del usuario')
);
```

Puedes agrupar middleware en arrays reutilizables:

```js
const logStuff = [logOriginalUrl, logMethod];
app.get('/usuario/:id', logStuff, (req, res) => res.send('Usuario'));
```

### 2. A nivel de router

Funciona igual pero enlazado a una instancia de `express.Router()`.

```js
const router = express.Router();

router.use((req, res, next) => {
  console.log('Hora:', Date.now());
  next();
});

router.get('/usuario/:id', (req, res) => res.send('Usuario'));

app.use('/', router);
```

Con `next('router')` se abandona el router y el control vuelve a la aplicación. Ejemplo: un router que solo responde si llega la cabecera `x-auth`; en otro caso, lo que haya después del router responde 401:

```js
const router = express.Router();

router.use((req, res, next) => {
  if (!req.headers['x-auth']) return next('router');   // salir del router
  next();
});
router.get('/usuario/:id', (req, res) => res.send('Hola, usuario'));

app.use('/admin', router, (req, res) => res.sendStatus(401));
```

### 3. De manejo de errores

Se distinguen por tener **cuatro parámetros** `(err, req, res, next)`. Se explican en [Manejo de errores](04-manejo-de-errores.md).

### 4. Integrados en Express

| Middleware | Función |
|---|---|
| `express.json()` | Interpreta cuerpos JSON y los deja en `req.body` |
| `express.urlencoded()` | Interpreta formularios (`application/x-www-form-urlencoded`) |
| `express.text()` / `express.raw()` | Cuerpos de texto / binarios (Buffer) |
| `express.static()` | Sirve archivos estáticos |

```js
app.use(express.json());                          // imprescindible para recibir JSON
app.use(express.urlencoded({ extended: true }));  // para formularios HTML
```

> **Express 5:** si no registras un parser, `req.body` vale `undefined` (en Express 4 era `{}`). Además, `express.urlencoded` ahora tiene `extended: false` por defecto.

### 5. De terceros

Se instalan con npm y se cargan con `app.use()`:

```bash
npm install cookie-parser cors helmet
```

```js
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

app.use(helmet());
app.use(cors());
app.use(cookieParser());
```

Los más habituales: `helmet` (cabeceras de seguridad), `cors` (control de orígenes), `cookie-parser`, `morgan` (log de peticiones), `compression`, `express-rate-limit`. En la web de Express hay una lista de middleware de terceros.

## Escribir middleware que añade datos a la petición

```js
const tiempoDePeticion = (req, res, next) => {
  req.tiempoDePeticion = Date.now();
  next();
};

app.use(tiempoDePeticion);
app.get('/', (req, res) => res.send(`Petición hecha en: ${req.tiempoDePeticion}`));
```

Este patrón (dejar información en `req` para los siguientes middleware) es la base de la autenticación: un middleware verifica el token y deja el usuario en `req.usuario`.

## Middleware configurable

Si necesitas parametrizar un middleware, exporta una **función que devuelve el middleware**:

```js
// middlewares/autorizarRoles.js
module.exports = function autorizarRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }
    next();
  };
};

// uso
app.delete('/usuarios/:id', autenticar, autorizarRoles('admin'), eliminarUsuario);
```

## Middleware asíncrono (Express 5)

En Express 5, si un middleware o handler **devuelve una promesa** y esta se rechaza (o la función `async` lanza un error), Express llama automáticamente a `next(error)`. Ya no hace falta un `try/catch` en cada función:

```js
async function validarCookies(req, res, next) {
  await validadorExterno(req.cookies);   // si lanza, va al manejador de errores
  next();
}
```

## Control de flujo con `next`

| Llamada | Efecto |
|---|---|
| `next()` | Pasa al siguiente middleware o handler |
| `next('route')` | Salta el resto de handlers de la ruta actual (solo en `app.METHOD` / `router.METHOD`) |
| `next('router')` | Sale del router actual |
| `next(error)` | Se trata como error: salta a los middleware de errores |

## Puntos clave

- Un middleware o llama a `next()` o termina la respuesta; nunca ninguna de las dos.
- El **orden de registro** define el orden de ejecución.
- `express.json()` es necesario para leer cuerpos JSON.
- Con Express 5, los errores en funciones `async` llegan solos al manejador de errores.

**Siguiente:** [Manejo de errores](04-manejo-de-errores.md)
