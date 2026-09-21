---
title: "Autenticación con JWT"
description: "Qué es un JSON Web Token, cómo firmarlo y verificarlo con jsonwebtoken y cómo protegerlo en Express con un middleware Bearer."
section: seguridad
order: 2
level: intermedio
tags: [jwt, autenticacion, token, bearer, middleware]
prerequisites: [01-contrasenas-bcrypt]
tested_on: "jsonwebtoken 9 · Express 5.2"
---

# Autenticación con JWT

**Autenticación** = comprobar *quién eres*. Con una API REST *stateless* (sin sesiones en el servidor) se usa habitualmente un **JSON Web Token (JWT)**:

1. El usuario envía sus credenciales (`POST /auth/login`).
2. Si son correctas, el servidor devuelve un **token firmado**.
3. En cada petición posterior, el cliente envía el token en la cabecera `Authorization`.
4. Un middleware verifica el token y, si es válido, deja pasar la petición.

```text
Cliente                                   Servidor
  │ ── POST /auth/login {email,password} ─► │ comprueba con bcrypt
  │ ◄──────────── { token } ─────────────── │ firma el token con JWT_SECRET
  │ ── GET /tareas  Authorization: Bearer <token> ─► │ verifica la firma → req.usuario
  │ ◄──────────── datos ─────────────────── │
```

## Anatomía de un JWT

Un JWT son tres partes codificadas en Base64URL, separadas por puntos: `cabecera.payload.firma`.

- **Cabecera**: algoritmo de firma (por defecto `HS256`) y tipo (`JWT`).
- **Payload**: los datos (*claims*) que incluyes, como el `id` del usuario o su `rol`, más `iat` (emitido en) y `exp` (expiración).
- **Firma**: garantiza que nadie modificó el contenido.

> **Aviso:** el payload **está codificado, no cifrado**: cualquiera que tenga el token puede leerlo. **No incluyas contraseñas ni datos sensibles.** La firma solo garantiza que no se ha alterado.

## Instalación

```bash
npm install jsonwebtoken
```

## Firmar y verificar

```js
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: usuario.id, rol: usuario.rol },     // payload
  process.env.JWT_SECRET,                   // secreto guardado en una variable de entorno
  { expiresIn: '1h' }                       // caducidad
);

try {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  console.log(payload);                     // { id, rol, iat, exp }
} catch (err) {
  // err.name === 'TokenExpiredError'  → caducado
  // err.name === 'JsonWebTokenError'  → firma inválida o token malformado
}
```

## Login que devuelve el token

```js
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const usuario = await Usuario.findOne({ email }).select('+password');
  const coincide = usuario && (await bcrypt.compare(password, usuario.password));
  if (!coincide) return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  res.json({ token });
};
```

## Middleware de autenticación

El estándar es enviar el token en la cabecera `Authorization` con el esquema **Bearer**:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

El middleware debe separar el esquema del token (un error muy común es pasar la cabecera completa, con la palabra `Bearer`, a `jwt.verify`):

```js
// middlewares/auth.js
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const cabecera = req.get('Authorization') || '';
  const [esquema, token] = cabecera.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.id, rol: payload.rol };   // disponible en los siguientes middleware
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = { autenticar };
```

Uso en rutas:

```js
const { autenticar } = require('../middlewares/auth');

router.get('/tareas', autenticar, listarTareas);           // una ruta
router.use(autenticar);                                     // o todas las de este router
```

## Probarlo con curl

```bash
# 1. Iniciar sesión y obtener el token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"secreto123"}'

# 2. Usar el token
curl http://localhost:3000/tareas -H "Authorization: Bearer <TOKEN>"
```

En Postman: pestaña **Authorization → Bearer Token** y pega el token.

## 401 frente a 403

| Código | Significado | Ejemplo |
|---|---|---|
| **401 Unauthorized** | No estás autenticado | Sin token, token inválido o caducado |
| **403 Forbidden** | Estás autenticado pero **no tienes permiso** | Un usuario normal intenta una ruta de administrador |

## Buenas prácticas

- **Secreto largo y aleatorio**, guardado en variable de entorno (`JWT_SECRET`), nunca en el código ni en Git. Falla al arrancar si no está definido.
- **Caducidad corta** (`expiresIn`): minutos u horas. Para sesiones largas se usan *refresh tokens* (un segundo token, de larga duración, que solo sirve para pedir uno nuevo).
- Usa **HTTPS** siempre: quien intercepte un token puede suplantar al usuario hasta que caduque.
- Guarda el token en el cliente con cuidado: el `localStorage` es accesible desde JavaScript (riesgo XSS); las cookies `HttpOnly` + `Secure` + `SameSite` lo protegen mejor, pero requieren considerar CSRF.
- Los tokens JWT no pueden «revocarse» individualmente sin infraestructura extra (lista de bloqueo, versión de token en la BD…); por eso conviene que caduquen pronto.
- Verifica siempre con `jwt.verify`, nunca con `jwt.decode`: `decode` **no comprueba la firma**.

## Puntos clave

- Login → `jwt.sign` → cliente envía `Authorization: Bearer <token>` → middleware `jwt.verify`.
- El payload es legible por cualquiera: nada sensible dentro.
- `401` = no autenticado; `403` = sin permisos.

**Siguiente:** [Autorización por roles](03-autorizacion-roles.md)
