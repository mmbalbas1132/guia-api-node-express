---
title: "MVC y arquitectura por capas"
description: "El patrón Modelo-Vista-Controlador adaptado a una API con Express y la separación en rutas, controladores, servicios y modelos."
section: arquitectura
order: 3
level: intermedio
tags: [mvc, capas, controladores, servicios, estructura, express]
prerequisites: [02-principios-solid]
tested_on: "Express 5.2 · Node.js 22"
---

# MVC y arquitectura por capas

## El patrón MVC

**Modelo-Vista-Controlador** separa una aplicación en tres responsabilidades:

| Componente | Responsabilidad |
|---|---|
| **Modelo** | Los datos y la lógica de negocio (esquema, validaciones, reglas) |
| **Vista** | Cómo se presenta la información al usuario |
| **Controlador** | Recibe la petición, coordina el modelo y devuelve la respuesta |

En una **API REST** que devuelve JSON, la «vista» es simplemente la respuesta JSON (o la aplicación frontend que la consume), así que en la práctica se trabaja con **rutas + controladores + modelos**.

## Estructura de carpetas

```text
src/
├── app.js
├── server.js
├── config/            # configuración y conexión a la BD
├── models/            # esquemas / modelos de datos
│   └── Usuario.js
├── controllers/       # lógica de cada endpoint
│   └── usuarioController.js
├── routes/            # mapeo URL → controlador
│   └── usuarioRoutes.js
└── middlewares/       # autenticación, validación, errores
```

### Modelo

```js
// models/Usuario.js
const { Schema, model } = require('mongoose');

const usuarioSchema = new Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

module.exports = model('Usuario', usuarioSchema);
```

### Controlador

```js
// controllers/usuarioController.js
const Usuario = require('../models/Usuario');

exports.crearUsuario = async (req, res) => {
  const { nombre, email } = req.body;
  const usuario = await Usuario.create({ nombre, email });
  res.status(201).json(usuario);
};

exports.listarUsuarios = async (req, res) => {
  res.json(await Usuario.find());
};
```

### Rutas

```js
// routes/usuarioRoutes.js
const { Router } = require('express');
const controlador = require('../controllers/usuarioController');

const router = Router();
router.get('/', controlador.listarUsuarios);
router.post('/', controlador.crearUsuario);

module.exports = router;
```

```js
// app.js
app.use('/usuarios', require('./routes/usuarioRoutes'));
```

## Añadir una capa de servicios

En cuanto la lógica de negocio crece, un controlador que hace demasiadas cosas viola el principio de responsabilidad única. Se introduce una capa de **servicios**: el controlador se limita a traducir HTTP (leer `req`, elegir el código de estado, enviar `res`) y **delega** la lógica en el servicio, que no sabe nada de Express.

```text
Petición HTTP
   │
   ▼
[ Rutas ]  ─►  [ Middleware: auth, validación ]
   │
   ▼
[ Controlador ]   traduce HTTP ⇄ llamadas a negocio
   │
   ▼
[ Servicio ]      reglas de negocio (independiente de Express)
   │
   ▼
[ Repositorio / Modelo ]   acceso a datos (ver patrón repositorio)
   │
   ▼
Base de datos
```

```js
// services/tareaService.js
const Tarea = require('../models/Tarea');

exports.completarTarea = async (id, usuarioId) => {
  const tarea = await Tarea.findOne({ _id: id, usuario: usuarioId });
  if (!tarea) return null;
  tarea.completada = true;
  return tarea.save();
};
```

```js
// controllers/tareaController.js
const servicio = require('../services/tareaService');

exports.completar = async (req, res) => {
  const tarea = await servicio.completarTarea(req.params.id, req.usuario.id);
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(tarea);
};
```

Ventajas de esta separación:

- El servicio se puede **probar sin levantar un servidor HTTP**.
- La misma lógica se reutiliza desde otro punto de entrada (un script, una cola de mensajes, una tarea programada).
- Cambiar la base de datos o el framework afecta solo a una capa.

## Reglas de convivencia entre capas

| Capa | Puede conocer | No debe conocer |
|---|---|---|
| Rutas | Controladores, middleware | Modelos, base de datos |
| Controladores | `req`/`res`, servicios | Detalles de la base de datos |
| Servicios | Repositorios/modelos | `req`/`res` de Express |
| Modelos/repositorios | El driver de la base de datos | Nada de HTTP |

## Organizar por funcionalidad en lugar de por tipo

Otra opción, habitual en proyectos grandes, es agrupar por **módulo de negocio** (*feature folders*):

```text
src/
├── usuarios/
│   ├── usuario.model.js
│   ├── usuario.controller.js
│   ├── usuario.service.js
│   └── usuario.routes.js
└── tareas/
    └── …
```

Refuerza la idea de **monolito modular** ([ver arriba](01-monolito-vs-microservicios.md)): cada carpeta podría convertirse algún día en un servicio independiente.

## Puntos clave

- Para una API: rutas → controladores → (servicios) → modelos.
- Los controladores traducen HTTP; los servicios contienen la lógica de negocio y no conocen Express.
- Separar `app.js` y `server.js` facilita las pruebas.

**Siguiente:** [Patrón repositorio](04-patron-repositorio.md)
