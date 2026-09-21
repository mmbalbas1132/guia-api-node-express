---
title: "Contraseñas seguras con bcrypt"
description: "Almacenar contraseñas con hash y salt usando bcrypt: registro, comparación en el login y errores habituales."
section: seguridad
order: 1
level: intermedio
tags: [bcrypt, hash, contrasenas, autenticacion, seguridad]
prerequisites: [07-validacion-con-express-validator]
tested_on: "bcrypt 6 · Node.js 22"
---

# Contraseñas seguras con bcrypt

**Una contraseña nunca se guarda en texto plano ni cifrada de forma reversible.** Se guarda un **hash**: el resultado de una función unidireccional que no puede invertirse. Cuando el usuario inicia sesión, se calcula el hash de lo que escribe y se compara con el guardado.

`bcrypt` es un algoritmo diseñado para contraseñas: es **deliberadamente lento** (dificulta los ataques de fuerza bruta) y añade automáticamente una **sal** (*salt*) aleatoria a cada hash, de modo que dos usuarios con la misma contraseña obtienen hashes distintos.

```bash
npm install bcrypt
```

> **Alternativa:** `bcryptjs` es una implementación en JavaScript puro, con la misma API (`hash`, `compare`), útil si no puedes compilar o descargar binarios nativos. También existe `crypto.scrypt` en el módulo `crypto` integrado de Node.js.

## Generar un hash

```js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const hash = await bcrypt.hash('miContraseña123', SALT_ROUNDS);
console.log(hash);
// $2b$10$...  (60 caracteres: versión, coste, sal y hash)
```

El segundo parámetro es el **coste** (*salt rounds*): cada incremento duplica el tiempo de cálculo. Un valor de 10 es habitual como mínimo razonable; ajusta según el hardware y la tolerancia de latencia en el login.

## Comprobar una contraseña

```js
const coincide = await bcrypt.compare('miContraseña123', hash);   // true
const noCoincide = await bcrypt.compare('otra', hash);            // false
```

`compare` extrae la sal y el coste del propio hash, por lo que no necesitas guardarlos aparte.

## Registro y login en Express

```js
// controllers/authController.js
const bcrypt = require('bcrypt');
const Usuario = require('../models/Usuario');

exports.registrar = async (req, res) => {
  const { nombre, email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);
  const usuario = await Usuario.create({ nombre, email, password: hash });

  res.status(201).json({
    mensaje: 'Usuario registrado con éxito',
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },   // ¡sin el hash!
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const usuario = await Usuario.findOne({ email }).select('+password');   // el hash está oculto por defecto
  const coincide = usuario && (await bcrypt.compare(password, usuario.password));

  if (!coincide) {
    // Mismo mensaje si el email no existe o la contraseña es incorrecta
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  // … generar el token (ver la página de JWT)
};
```

## Errores frecuentes

| Error | Por qué es un problema | Solución |
|---|---|---|
| Guardar la contraseña en texto plano | Una filtración de la BD expone todas las cuentas | Guardar solo el hash |
| Usar SHA-256 o MD5 sin más | Son rápidos: se pueden probar miles de millones por segundo | Usar bcrypt, scrypt o Argon2 |
| Devolver el hash en las respuestas de la API | Facilita ataques de fuerza bruta offline | Excluir el campo (en Mongoose, `select: false`) |
| Mensajes distintos para «usuario no existe» y «contraseña incorrecta» | Permite descubrir qué emails están registrados | Un único mensaje genérico con `401` |
| Sin límite de intentos | Permite fuerza bruta contra el login | Limitar intentos (ver [Helmet, CORS y límites](04-helmet-cors-y-limites.md)) |
| No validar la contraseña | Contraseñas triviales o vacías | Exigir longitud mínima (`isLength({ min: 8 })`) |

> **Límite de bcrypt:** el algoritmo solo considera los primeros **72 bytes** de la contraseña; lo que exceda se ignora. No es un problema práctico con contraseñas normales, pero conviene limitar la longitud máxima aceptada.

## Puntos clave

- Guarda siempre el hash (bcrypt), nunca la contraseña.
- `bcrypt.hash(password, 10)` al registrar; `bcrypt.compare` al iniciar sesión.
- No devuelvas el hash en ninguna respuesta y no distingas «usuario» de «contraseña» en los errores.

**Siguiente:** [Autenticación con JWT](02-jwt.md)
