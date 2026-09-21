---
title: "Validación con express-validator"
description: "Validar y sanear la entrada de las peticiones con express-validator: cadenas de validación, mensajes y middleware reutilizable."
section: express
order: 7
level: intermedio
tags: [validacion, express-validator, sanitizacion, seguridad, body]
prerequisites: [06-api-rest-crud]
tested_on: "express-validator 7.3 · Express 5.2"
---

# Validación con express-validator

**Nunca confíes en los datos que envía el cliente.** Toda entrada (cuerpo, parámetros, query, cabeceras) debe validarse antes de usarla. `express-validator` ofrece validadores y saneadores encadenables como middleware de Express.

```bash
npm install express-validator
```

## Uso básico

```js
const { body, validationResult } = require('express-validator');

app.post(
  '/usuarios',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Email no válido').normalizeEmail(),
    body('edad').optional().isInt({ min: 0, max: 120 }).withMessage('Edad no válida').toInt(),
  ],
  (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }
    // Aquí los datos ya están validados y saneados
    res.status(201).json(req.body);
  }
);
```

Cada cadena empieza con un **localizador** que dice de dónde se toma el campo:

| Localizador | Origen |
|---|---|
| `body('campo')` | `req.body` |
| `param('id')` | `req.params` |
| `query('q')` | `req.query` |
| `header('x-api-key')` | Cabeceras |
| `cookie('nombre')` | Cookies |

Después se encadenan **validadores** (comprueban) y **saneadores** (transforman):

| Validadores habituales | Saneadores habituales |
|---|---|
| `notEmpty()`, `isEmail()`, `isInt({min,max})`, `isFloat()`, `isBoolean()`, `isLength({min,max})`, `isMongoId()`, `isIn([...])`, `isURL()`, `matches(/regex/)`, `optional()`, `custom(fn)` | `trim()`, `escape()`, `normalizeEmail()`, `toInt()`, `toFloat()`, `toBoolean()`, `toLowerCase()` |

`withMessage('…')` asocia el mensaje al validador inmediatamente anterior.

## Respuesta de error

Con `errores.array()` se obtiene una lista como esta:

```json
{
  "errores": [
    { "type": "field", "value": "", "msg": "El nombre es obligatorio", "path": "nombre", "location": "body" },
    { "type": "field", "value": "x", "msg": "Email no válido", "path": "email", "location": "body" }
  ]
}
```

## Middleware `validar` reutilizable

Para no repetir el bloque de comprobación en cada ruta, extráelo:

```js
// middlewares/validar.js
const { validationResult } = require('express-validator');

module.exports = function validar(req, res, next) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  next();
};
```

```js
// routes/authRoutes.js
const { body } = require('express-validator');
const validar = require('../middlewares/validar');

router.post(
  '/registrar',
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').trim().isEmail().withMessage('Email no válido').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  ],
  validar,          // se coloca DESPUÉS de las reglas y ANTES del controlador
  registrar
);
```

## Validar parámetros de ruta

```js
const { param } = require('express-validator');

router.get(
  '/:id',
  param('id').isMongoId().withMessage('Identificador no válido'),
  validar,
  obtenerTarea
);
```

Con `toInt()` el parámetro llega ya convertido a número al handler (`req.params.id` deja de ser texto).

## Validaciones personalizadas

```js
body('confirmacion').custom((valor, { req }) => {
  if (valor !== req.body.password) {
    throw new Error('Las contraseñas no coinciden');
  }
  return true;
});
```

## Por qué la validación también es seguridad

- Evita datos corruptos y errores inesperados en la base de datos.
- Frena ataques de **inyección**: un campo que debería ser un texto (`email`) pero llega como objeto (`{"$gt": ""}`) puede alterar una consulta de MongoDB (ver [Sanitización y validación de entrada](../03-seguridad/05-sanitizacion-y-validacion-entrada.md)). `isEmail()` o `isString()` lo rechazan.
- Reduce la superficie de ataques XSS al escapar o normalizar texto que luego se mostrará.

> **Consejo:** valida en **la frontera** (rutas) y confía en el esquema de la base de datos (Mongoose, Sequelize) como segunda red de seguridad. Ninguna de las dos capas sustituye a la otra.

## Cuerpos ausentes en Express 5

Si la petición no trae cuerpo, `req.body` es `undefined`. `express-validator` lo tolera y simplemente devolverá errores de «campo obligatorio» (400), lo que evita el `TypeError` que sí obtendrías al desestructurar `req.body` sin validar antes.

## Puntos clave

- Localizador (`body`, `param`, `query`) + validadores + saneadores, encadenados.
- Un middleware `validar` común convierte los errores en una respuesta `400`.
- Valida y sanea en la frontera; el esquema de la BD es la segunda capa.

**Siguiente:** [Archivos estáticos y plantillas](08-archivos-estaticos-y-plantillas.md)
