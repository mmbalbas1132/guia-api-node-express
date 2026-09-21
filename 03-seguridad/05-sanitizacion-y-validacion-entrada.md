---
title: "Sanitización y validación de entrada"
description: "Defensa frente a inyecciones (SQL y NoSQL), XSS y otros ataques que aprovechan la entrada del usuario."
section: seguridad
order: 5
level: intermedio
tags: [inyeccion, nosql-injection, sql-injection, xss, csrf, sanitizacion]
prerequisites: [04-helmet-cors-y-limites]
tested_on: "Mongoose 9 · Sequelize 6 · Express 5.2"
---

# Sanitización y validación de entrada

La regla de oro: **todo lo que llega del cliente es no fiable**. Las vulnerabilidades más graves de las aplicaciones web nacen de tratar la entrada del usuario como si fuese código o una consulta.

| Ataque | Idea | Defensa principal |
|---|---|---|
| **Inyección SQL** | El atacante mete SQL en un campo y cambia el sentido de la consulta | Consultas parametrizadas / ORM |
| **Inyección NoSQL** | Envía objetos con operadores (`{"$gt": ""}`) donde se esperaba un texto | Validar tipos; `sanitizeFilter` |
| **XSS** (Cross-Site Scripting) | Se guarda o refleja código JavaScript que luego ejecuta otro usuario | Escapar la salida, CSP (Helmet), sanear entrada |
| **CSRF** | Un sitio malicioso hace que el navegador del usuario envíe una petición a tu API con sus cookies | Cookies `SameSite`, tokens anti-CSRF |
| **Command injection** | La entrada acaba dentro de un comando del sistema | No construir comandos con entrada; usar `execFile` con argumentos |
| **ReDoS** | Una expresión regular mal escrita se vuelve exponencialmente lenta | Regex simples; herramientas como `safe-regex` |

## 1. Validar y sanear con `express-validator`

Ya vimos cómo ([Validación con express-validator](../02-express/07-validacion-con-express-validator.md)). Los saneadores más útiles:

```js
body('nombre').trim().escape(),              // quita espacios y escapa caracteres HTML (< > & ' ")
body('email').isEmail().normalizeEmail(),    // valida y normaliza
body('edad').isInt({ min: 0 }).toInt(),      // valida y convierte a número
```

`escape()` es apropiado cuando el texto se va a mostrar como HTML. Si tu API solo devuelve JSON, lo más importante es que el **frontend** escape al pintar (los frameworks modernos lo hacen por defecto).

## 2. Inyección SQL: consultas parametrizadas

**Nunca** construyas consultas concatenando texto del usuario:

```js
// ❌ VULNERABLE
const [filas] = await sequelize.query(`SELECT * FROM usuarios WHERE email = '${req.body.email}'`);

// ✅ Parámetros con nombre: el valor viaja separado de la consulta
const filas = await sequelize.query('SELECT * FROM usuarios WHERE email = :email', {
  replacements: { email: req.body.email },
  type: QueryTypes.SELECT,
});

// ✅ Los métodos del ORM (findAll, findOne…) ya parametrizan
await Usuario.findOne({ where: { email: req.body.email } });
```

Con `pg` directamente: `client.query('SELECT * FROM usuarios WHERE email = $1', [email])`.

## 3. Inyección NoSQL en MongoDB

MongoDB y Mongoose aceptan **operadores dentro del filtro**. Si pasas `req.body` directamente a una consulta, un atacante puede enviar un objeto en lugar de un texto:

```js
// Petición maliciosa: POST /auth/login
// { "email": { "$gt": "" }, "password": { "$gt": "" } }

// ❌ VULNERABLE: "$gt": "" es cierto para cualquier valor → devuelve el primer usuario
const usuario = await Usuario.findOne({ email: req.body.email, password: req.body.password });
```

Comprobado con Mongoose 9: sin protección, esa consulta **devuelve un usuario**. Defensas (aplícalas todas):

1. **Validar el tipo** en el borde: `body('email').isEmail()` rechaza un objeto porque no es un texto con formato de email.
2. **Forzar tipo** manualmente cuando no uses `express-validator`: `String(req.body.email)`.
3. Activar **`sanitizeFilter`** de Mongoose, que trata cualquier objeto de operadores en el filtro como un valor literal y falla con `CastError` en lugar de ejecutarlo:

   ```js
   const mongoose = require('mongoose');
   mongoose.set('sanitizeFilter', true);            // global

   // o solo para una consulta:
   await Usuario.findOne(filtro).setOptions({ sanitizeFilter: true });
   ```

   Con `sanitizeFilter`, si necesitas un operador legítimo lo marcas con `mongoose.trusted({ $gt: 5 })`.

4. Nunca compares contraseñas en la consulta: busca por email y compara el hash con `bcrypt.compare`.

## 4. XSS

- **Escapa al mostrar**: los frameworks de frontend (React, Vue, Angular) escapan por defecto; no uses `innerHTML` / `dangerouslySetInnerHTML` con datos de usuarios.
- **Content-Security-Policy** (la activa Helmet por defecto) limita qué scripts puede ejecutar una página.
- Cookies con `HttpOnly` para que un XSS no pueda leerlas.

## 5. CSRF

Es relevante cuando la autenticación se basa en **cookies** (el navegador las adjunta solo). Si tu API usa el token en la cabecera `Authorization: Bearer …`, el navegador no lo añade automáticamente, y el riesgo CSRF es mucho menor. Si usas cookies de sesión: `SameSite=Lax` o `Strict`, y tokens anti-CSRF.

## 6. Redirecciones abiertas

Si aceptas una URL del usuario para redirigir (`?url=…`), valida que el destino sea uno permitido:

```js
app.get('/salir', (req, res) => {
  try {
    if (new URL(req.query.url).host !== 'miapp.com') {
      return res.status(400).end('Redirección no permitida');
    }
  } catch {
    return res.status(400).end('URL no válida');
  }
  res.redirect(req.query.url);
});
```

## 7. Herramientas de comprobación

- `sqlmap`: detecta inyecciones SQL en tus endpoints.
- `safe-regex`: comprueba que tus expresiones regulares no son vulnerables a ReDoS.
- `nmap` y `sslyze`: revisan la configuración TLS del servidor.
- `npm audit`: vulnerabilidades en dependencias.

## Puntos clave

- Valida el **tipo y formato** de cada campo antes de usarlo.
- SQL: consultas parametrizadas. MongoDB: valida tipos y activa `sanitizeFilter`.
- Escapa siempre al mostrar datos de usuarios; usa CSP.

**Siguiente:** [Buenas prácticas de seguridad en Node.js](06-buenas-practicas-seguridad-node.md)
