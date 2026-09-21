---
title: "Autorización por roles"
description: "Restringir rutas según el rol del usuario con un middleware configurable y comprobar la propiedad de los recursos."
section: seguridad
order: 3
level: intermedio
tags: [autorizacion, roles, rbac, middleware, 403]
prerequisites: [02-jwt]
tested_on: "Express 5.2 · Node.js 22"
---

# Autorización por roles

**Autorización** = decidir *qué puedes hacer*. Va **después** de la autenticación: primero sabemos quién es el usuario, luego comprobamos si tiene permiso para la acción.

El modelo más simple es el **control de acceso basado en roles (RBAC)**: cada usuario tiene un rol (`usuario`, `admin`, `editor`…) y cada ruta declara qué roles admite.

## 1. Incluir el rol en el token

El rol se guarda en el usuario y se incluye en el payload al firmar el JWT:

```js
const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
```

Y el modelo de usuario define los valores permitidos:

```js
rol: { type: String, enum: ['usuario', 'admin'], default: 'usuario' }
```

> **Seguridad:** no permitas que el cliente elija su propio rol en el registro (`req.body.rol`). El registro público debe crear siempre el rol por defecto; los administradores se crean por otra vía.

## 2. Middleware `autorizarRoles`

Es una **fábrica de middleware**: recibe los roles permitidos y devuelve el middleware.

```js
// middlewares/auth.js
function autorizarRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.usuario?.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

module.exports = { autenticar, autorizarRoles };
```

## 3. Usarlo en las rutas

El orden importa: **primero `autenticar`** (rellena `req.usuario`), **después `autorizarRoles`**.

```js
const { autenticar, autorizarRoles } = require('../middlewares/auth');

// Cualquier usuario autenticado
router.get('/tareas', autenticar, listarTareas);

// Solo administradores
router.get('/usuarios', autenticar, autorizarRoles('admin'), listarUsuarios);
router.delete('/usuarios/:id', autenticar, autorizarRoles('admin'), eliminarUsuario);

// Varios roles
router.put('/articulos/:id', autenticar, autorizarRoles('admin', 'editor'), editarArticulo);
```

Resultado:

| Situación | Respuesta |
|---|---|
| Sin token | `401` |
| Token válido, rol `usuario`, ruta de admin | `403` |
| Token válido, rol `admin` | `200` |

## Autorización por propiedad del recurso

Los roles no bastan: aunque todos los usuarios puedan leer «sus tareas», **no deben poder leer las de otro**. Filtra siempre por el usuario autenticado:

```js
// ❌ Vulnerable: cualquier usuario autenticado puede pedir cualquier id
const tarea = await Tarea.findById(req.params.id);

// ✅ Solo devuelve la tarea si pertenece al usuario autenticado
const tarea = await Tarea.findOne({ _id: req.params.id, usuario: req.usuario.id });
if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
```

Devolver `404` (y no `403`) cuando el recurso existe pero es de otro usuario evita revelar que ese identificador existe. Este fallo (*IDOR*, referencia directa insegura a objetos) es de los más frecuentes en las APIs.

## Puntos clave

- `autenticar` primero, `autorizarRoles(...)` después.
- El rol nunca lo decide el cliente.
- Además del rol, comprueba siempre que el recurso pertenece al usuario.

**Siguiente:** [Helmet, CORS y límites de uso](04-helmet-cors-y-limites.md)
