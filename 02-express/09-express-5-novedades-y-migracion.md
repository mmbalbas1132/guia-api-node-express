---
title: "Novedades de Express 5 y migración desde Express 4"
description: "Cambios de Express 5 respecto a Express 4: rutas, promesas, req.body, req.query y métodos eliminados."
section: express
order: 9
level: intermedio
tags: [express5, migracion, express4, breaking-changes, codemods]
prerequisites: [08-archivos-estaticos-y-plantillas]
tested_on: "Express 5.2 · Node.js 22"
---

# Novedades de Express 5 y migración desde Express 4

Express 5 mantiene la misma API básica que Express 4, pero incluye cambios que **rompen la compatibilidad**. Es importante conocerlos porque **muchos tutoriales y respuestas antiguas siguen mostrando código de Express 4**. Requiere Node.js 18 o superior.

```bash
npm install "express@5"
```

## Herramientas para migrar

Existen *codemods* que aplican automáticamente muchos de los cambios:

```bash
npx codemod@latest @expressjs/v5-migration-recipe
```

Después, ejecuta tus pruebas automáticas y arranca la app: los métodos eliminados fallan de inmediato.

## Resumen de cambios

### Mejoras que no requieren migración

- **Promesas rechazadas en handlers y middleware** se reenvían automáticamente al manejador de errores. Ya no necesitas `.catch(next)` ni `try/catch` en cada handler `async`.
- `res.render()` es siempre asíncrono.
- `express.json()`, `express.urlencoded()`, `express.text()` y `express.raw()` admiten cuerpos comprimidos con Brotli (`Content-Encoding: br`).

```js
// Express 4
app.get('/usuario/:id', (req, res, next) => {
  obtenerUsuario(req.params.id).then((u) => res.send(u)).catch(next);
});

// Express 5
app.get('/usuario/:id', async (req, res) => {
  const usuario = await obtenerUsuario(req.params.id);
  res.send(usuario);
});
```

### Sintaxis de rutas (path-to-regexp v8)

| Express 4 | Express 5 |
|---|---|
| `'/*'` | `'/*splat'` (o `'/{*splat}'` para incluir la raíz `/`) |
| `'/:file.:ext?'` (`?` opcional) | `'/:file{.:ext}'` (llaves) |
| `'/[discussion\|page]/:slug'` (regex en la ruta) | `['/discussion/:slug', '/page/:slug']` (array) |
| `'/:id(\\d+)'` | No soportado: valida en el handler o con `express-validator` |

Los caracteres `( ) [ ] ? + !` están reservados: escápalos con `\` si los necesitas literales. Los nombres de parámetro deben ser identificadores JavaScript válidos (o ir entre comillas: `:"nombre-largo"`).

### Cambios en `req`

| Propiedad | Cambio |
|---|---|
| `req.body` | Vale `undefined` si el cuerpo no se ha interpretado (en Express 4 valía `{}`) |
| `req.query` | Ahora es un *getter* (no se puede reasignar) y el parser por defecto es «simple» en lugar de «extended» |
| `req.params` | Tiene prototipo nulo con rutas de texto; los comodines son **arrays**; los parámetros opcionales no encontrados se **omiten** (antes eran `undefined` o `''`) |
| `req.host` | Mantiene el número de puerto |
| `req.param(name)` | **Eliminado**: usa `req.params`, `req.body` o `req.query` explícitamente |
| `req.acceptsCharset/Encoding/Language` | Ahora en plural: `acceptsCharsets`, `acceptsEncodings`, `acceptsLanguages` |

### Cambios en `res`

| Antes (Express 4) | Ahora (Express 5) |
|---|---|
| `res.json(obj, 201)` | `res.status(201).json(obj)` |
| `res.send(body, 200)` | `res.status(200).send(body)` |
| `res.send(200)` (solo un número) | `res.sendStatus(200)` |
| `res.redirect(url, 302)` | `res.redirect(302, url)` |
| `res.redirect('back')` | `res.redirect(req.get('Referrer') \|\| '/')` |
| `res.sendfile(...)` | `res.sendFile(...)` |
| `res.sendFile(f, { hidden, from })` | `res.sendFile(f, { dotfiles: 'allow', root })` |
| `res.clearCookie(n, { maxAge, expires })` | Ignora `maxAge` y `expires` |
| `res.status(99)` | Lanza error: solo enteros de 100 a 999 |
| `res.vary()` sin argumento | Lanza error |

### Otros cambios

- `app.del()` → `app.delete()`.
- `app.param(fn)` y `router.param(fn)` (la firma con solo una función) ya no existen; `router.param()` ya no acepta un array de nombres.
- `express.static`: `dotfiles` vale `"ignore"` por defecto (también para directorios ocultos en la ruta); `express.static.mime` eliminado (usa el paquete `mime-types`); `hidden` y `from` sustituidos por `dotfiles` y `root`.
- `express.urlencoded`: `extended` es `false` por defecto.
- `app.listen(puerto, callback)`: el callback recibe el error si el servidor falla al abrirse (antes se lanzaba una excepción).
- `app.router` vuelve a existir como referencia al router base.
- Los tipos MIME se actualizan con `mime-db`; el más visible: `.js` se sirve como `text/javascript`.
- Los registros de depuración del router pasan del espacio de nombres `express:router` a `router`:

  ```bash
  DEBUG=express:*,router,router:* node index.js
  ```

## Lista de comprobación para migrar

1. Sube a `express@5` en una rama y ejecuta las pruebas.
2. Busca rutas con `*`, `?` opcional, regex dentro de la ruta o `:param(regex)` y reescríbelas.
3. Revisa todos los accesos a `req.body`: ¿hay `express.json()` registrado? ¿Se valida antes de desestructurar?
4. Sustituye `res.json(obj, status)`, `res.send(status)`, `res.redirect(url, status)`, `res.sendfile`, `req.param()`, `app.del()`.
5. Elimina los `try/catch` y `.catch(next)` redundantes en handlers `async`.
6. Comprueba que `express.static` sirve lo que esperas si usas directorios ocultos.

## Puntos clave

- Los handlers `async` ya no necesitan `try/catch` para llegar al manejador de errores.
- Cambia la sintaxis de rutas: comodines con nombre, opcionales con llaves.
- `req.body` puede ser `undefined`: valida antes de leerlo.
- Usa los codemods oficiales para automatizar gran parte de la migración.

**Siguiente sección:** [Seguridad](../03-seguridad/01-contrasenas-bcrypt.md)
