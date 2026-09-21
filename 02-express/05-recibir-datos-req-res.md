---
title: "Recibir datos y responder (req y res)"
description: "Leer parámetros, query string, cuerpo y cabeceras de la petición, y construir respuestas con códigos de estado correctos."
section: express
order: 5
level: basico
tags: [req, res, params, query, body, headers, status-codes]
prerequisites: [04-manejo-de-errores]
tested_on: "Express 5.2 · Node.js 22"
---

# Recibir datos y responder (`req` y `res`)

## De dónde vienen los datos de una petición

| Origen | Propiedad | Ejemplo de petición | Valor |
|---|---|---|---|
| Segmento de la ruta | `req.params` | `GET /usuarios/42` con la ruta `/usuarios/:id` | `{ id: '42' }` |
| Query string | `req.query` | `GET /tareas?completada=true&page=2` | `{ completada: 'true', page: '2' }` |
| Cuerpo (JSON o formulario) | `req.body` | `POST` con `{"nombre":"Ana"}` | `{ nombre: 'Ana' }` |
| Cabeceras | `req.get('Nombre')` / `req.headers` | `Authorization: Bearer …` | el texto de la cabecera |
| Otros | `req.method`, `req.originalUrl`, `req.ip` | | |

> **Todos los valores de `req.params` y `req.query` son texto.** Convierte y valida antes de usarlos (`Number(req.params.id)`, `parseInt(req.query.page, 10)`, o mejor con [express-validator](07-validacion-con-express-validator.md)).

## Parámetros de ruta

```js
app.get('/usuarios/:id', (req, res) => {
  res.json({ id: req.params.id });
});
```

## Query string

Se usa para filtros, ordenación y paginación:

```js
// GET /productos?categoria=libros&pagina=2
app.get('/productos', (req, res) => {
  const { categoria, pagina = '1' } = req.query;
  res.json({ categoria, pagina: Number(pagina) });
});
```

> **Express 5:** `req.query` es ahora un *getter*: no puedes modificarlo (una asignación como `req.query.page = 1` no se conserva; guarda los valores calculados en otra variable o en `res.locals`). Además, el intérprete por defecto es el «simple»: `?a[b]=1` produce `{ 'a[b]': '1' }` en lugar de un objeto anidado, y `?c=2&c=3` produce un array `['2', '3']`.

## Cuerpo de la petición

Para leer JSON, registra `express.json()` **antes** de las rutas:

```js
app.use(express.json());                          // application/json
app.use(express.urlencoded({ extended: true }));  // formularios HTML

app.post('/usuarios', (req, res) => {
  const { nombre, email } = req.body;
  res.status(201).json({ nombre, email });
});
```

Puntos a tener en cuenta:

- En **Express 5**, si no se pudo interpretar un cuerpo (no hay parser o no hay cuerpo), `req.body` es `undefined`. Desestructurar `const { nombre } = req.body` lanzaría un `TypeError`. Valida siempre la entrada antes (`express-validator`), o usa `req.body ?? {}`.
- Limita el tamaño con `express.json({ limit: '100kb' })` para evitar cuerpos gigantes.
- Un JSON mal formado genera un error con `err.type === 'entity.parse.failed'` (ver [Manejo de errores](04-manejo-de-errores.md)).

## Cabeceras

```js
const token = req.get('Authorization');       // no distingue mayúsculas
const idioma = req.headers['accept-language'];
```

## Respuestas

```js
res.send('texto o HTML');              // detecta el tipo automáticamente
res.json({ ok: true });                // JSON con Content-Type correcto
res.status(201).json(recurso);         // fijar el código antes de enviar
res.sendStatus(204);                   // estado + su texto estándar
res.status(204).end();                 // sin cuerpo
res.redirect(302, '/nueva-ruta');      // Express 5: primero el código, luego la URL
res.set('X-Mi-Cabecera', 'valor');     // cabeceras
res.cookie('nombre', 'valor', { httpOnly: true, secure: true });
res.sendFile(path.join(__dirname, 'public', 'index.html'));
```

> **Solo se responde una vez.** Llamar a `res.json()` dos veces provoca el error `ERR_HTTP_HEADERS_SENT`. En handlers con varias ramas usa `return res.status(...).json(...)` para cortar el flujo.

## Códigos de estado HTTP más usados

| Código | Significado | Cuándo usarlo |
|---|---|---|
| **200** OK | Éxito | Lectura o actualización correcta |
| **201** Created | Recurso creado | Respuesta a un `POST` que crea algo (opcionalmente con cabecera `Location`) |
| **204** No Content | Éxito sin cuerpo | `DELETE` correcto |
| **400** Bad Request | Petición inválida | Datos mal formados o que no pasan la validación |
| **401** Unauthorized | No autenticado | Falta el token o es inválido/expirado |
| **403** Forbidden | Sin permisos | Autenticado pero no autorizado (rol insuficiente) |
| **404** Not Found | No existe | Recurso o ruta inexistente |
| **409** Conflict | Conflicto | Recurso duplicado (p. ej. email ya registrado) |
| **422** Unprocessable Entity | Error semántico | Alternativa a 400 para errores de validación |
| **500** Internal Server Error | Fallo del servidor | Error no controlado |

Regla mnemotécnica: **2xx** = éxito, **3xx** = redirección, **4xx** = error del cliente, **5xx** = error del servidor.

## Puntos clave

- `req.params`, `req.query` y `req.body` son las tres fuentes de datos; los dos primeros son texto.
- Registra `express.json()` antes de las rutas y valida siempre la entrada.
- Elige el código de estado más preciso; ayuda a quien consume tu API.

**Siguiente:** [API REST con CRUD](06-api-rest-crud.md)
