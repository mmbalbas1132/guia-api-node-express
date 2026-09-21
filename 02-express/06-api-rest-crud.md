---
title: "API REST con CRUD"
description: "Principios de una API RESTful y un CRUD completo con Express: rutas, métodos HTTP, códigos de estado y validación."
section: express
order: 6
level: intermedio
tags: [rest, crud, api, http-methods, express]
prerequisites: [05-recibir-datos-req-res]
tested_on: "Express 5.2 · Node.js 22"
---

# API REST con CRUD

**REST** es un estilo de arquitectura para APIs web. Una API RESTful expone **recursos** (usuarios, tareas, productos…) identificados por URLs, y usa los **métodos HTTP** para indicar la acción que se realiza sobre ellos.

## Métodos HTTP y operaciones CRUD

| Operación | Método | Ruta ejemplo | Éxito |
|---|---|---|---|
| **C**reate (crear) | `POST` | `/usuarios` | `201 Created` |
| **R**ead (listar) | `GET` | `/usuarios` | `200 OK` |
| **R**ead (uno) | `GET` | `/usuarios/:id` | `200 OK` |
| **U**pdate (reemplazar) | `PUT` | `/usuarios/:id` | `200 OK` |
| **U**pdate (parcial) | `PATCH` | `/usuarios/:id` | `200 OK` |
| **D**elete (borrar) | `DELETE` | `/usuarios/:id` | `204 No Content` |

## Convenciones de diseño

- **Nombres de recursos en plural y sin verbos:** `/usuarios`, no `/obtenerUsuarios`. La acción la marca el método HTTP.
- **Jerarquías** para relaciones: `/usuarios/5/tareas`.
- **Filtros, orden y paginación** por *query string*: `/tareas?completada=true&page=2&limit=10`.
- **Respuestas en JSON** con estructura consistente y códigos de estado correctos (ver [tabla de códigos](05-recibir-datos-req-res.md)).
- **Versiona** la API cuando pueda cambiar de forma incompatible: `/api/v1/usuarios`.
- Los clientes **no guardan estado en el servidor** (*stateless*): cada petición lleva lo necesario (p. ej. el token de autenticación).

## CRUD completo (en memoria)

Este ejemplo guarda los datos en un array para centrarse en la API. En la práctica sustituirías el array por una base de datos (ver [Bases de datos](../04-bases-de-datos/01-conceptos-sql-vs-nosql.md)).

```js
const express = require('express');
const { body, param, validationResult } = require('express-validator');

const app = express();
app.use(express.json());

let usuarios = [{ id: 1, nombre: 'Ana', email: 'ana@example.com' }];
let siguienteId = 2;

// Middleware que corta la petición si la validación falló
const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });
  next();
};

const reglasUsuario = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('Email no válido').normalizeEmail(),
];
const reglaId = param('id').isInt({ min: 1 }).withMessage('id debe ser un entero positivo').toInt();

// LISTAR (con filtro opcional ?q=)
app.get('/usuarios', (req, res) => {
  const { q } = req.query;
  const resultado = q
    ? usuarios.filter((u) => u.nombre.toLowerCase().includes(String(q).toLowerCase()))
    : usuarios;
  res.json(resultado);
});

// LEER UNO
app.get('/usuarios/:id', reglaId, validar, (req, res) => {
  const usuario = usuarios.find((u) => u.id === req.params.id);   // toInt() ya lo convirtió a número
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
});

// CREAR
app.post('/usuarios', reglasUsuario, validar, (req, res) => {
  const { nombre, email } = req.body;
  const nuevo = { id: siguienteId++, nombre, email };
  usuarios.push(nuevo);
  res.status(201).location(`/usuarios/${nuevo.id}`).json(nuevo);
});

// ACTUALIZAR (reemplazo completo)
app.put('/usuarios/:id', reglaId, reglasUsuario, validar, (req, res) => {
  const indice = usuarios.findIndex((u) => u.id === req.params.id);
  if (indice === -1) return res.status(404).json({ error: 'Usuario no encontrado' });
  usuarios[indice] = { id: req.params.id, nombre: req.body.nombre, email: req.body.email };
  res.json(usuarios[indice]);
});

// BORRAR
app.delete('/usuarios/:id', reglaId, validar, (req, res) => {
  const antes = usuarios.length;
  usuarios = usuarios.filter((u) => u.id !== req.params.id);
  if (usuarios.length === antes) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.status(204).end();
});

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(3000, () => console.log('API en http://localhost:3000'));
```

Instala la dependencia de validación: `npm install express express-validator`.

### Probarla con curl

```bash
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Luis","email":"luis@example.com"}'

curl http://localhost:3000/usuarios
curl http://localhost:3000/usuarios/2
curl -X PUT http://localhost:3000/usuarios/2 -H "Content-Type: application/json" \
  -d '{"nombre":"Luis M.","email":"luis@example.com"}'
curl -X DELETE http://localhost:3000/usuarios/2 -i
```

También puedes probarla con Postman: crea una petición por endpoint, elige el método, la URL y, para `POST`/`PUT`, el cuerpo en formato *raw → JSON*.

## Organizar el CRUD por capas

Cuando la aplicación crece, mueve cada pieza a su carpeta: **rutas** (qué URL llama a qué), **controladores** (la lógica de cada endpoint) y **modelos** (acceso a datos). Con `express.Router()`:

```js
// routes/usuarios.js
const { Router } = require('express');
const c = require('../controllers/usuarioController');
const router = Router();

router.get('/', c.listar);
router.get('/:id', c.obtener);
router.post('/', c.crear);
router.put('/:id', c.actualizar);
router.delete('/:id', c.eliminar);

module.exports = router;

// app.js
app.use('/usuarios', require('./routes/usuarios'));
```

Esta separación se explica en [MVC y capas](../05-arquitectura/03-patron-mvc-y-capas.md) y se aplica en el [proyecto completo](../08-proyecto-api-tareas/01-diseno-y-planificacion.md).

## `PUT` frente a `PATCH`

- `PUT` **reemplaza** el recurso completo: el cliente envía todos los campos.
- `PATCH` modifica solo los campos enviados.

En la práctica, muchas APIs implementan `PUT` con actualización parcial; lo importante es documentar el comportamiento.

## Puntos clave

- Recursos en plural; la acción la da el método HTTP.
- Códigos correctos: `201` al crear, `204` al borrar, `400`/`404`/`409` para errores del cliente.
- Valida siempre la entrada antes de tocar los datos.

**Siguiente:** [Validación con express-validator](07-validacion-con-express-validator.md)
