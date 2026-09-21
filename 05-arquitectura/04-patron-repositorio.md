---
title: "Patrón repositorio"
description: "Aislar el acceso a datos detrás de un repositorio para desacoplar la lógica de negocio de la base de datos y facilitar las pruebas."
section: arquitectura
order: 4
level: avanzado
tags: [repositorio, patrones, acceso-a-datos, desacoplamiento, testing]
prerequisites: [03-patron-mvc-y-capas]
tested_on: "Node.js 22"
---

# Patrón repositorio

El **patrón repositorio** separa la lógica de acceso a datos del resto de la aplicación. En lugar de que los servicios llamen directamente a `Usuario.findAll()` (Sequelize) o `Usuario.find()` (Mongoose), hablan con un **repositorio** que expone operaciones con nombres del dominio: `crear`, `buscarPorEmail`, `listar`…

## Por qué usarlo

- **Desacopla** la lógica de negocio del ORM/ODM y de la base de datos: si cambias de MongoDB a PostgreSQL, solo reescribes el repositorio.
- **Centraliza** las consultas: el mismo filtro no se repite en diez controladores.
- Facilita las **pruebas**: en los tests sustituyes el repositorio real por uno en memoria (principio de inversión de dependencias).

## Un repositorio básico

```js
// repositories/UsuarioRepository.js
class UsuarioRepository {
  constructor(model) {
    this.model = model;          // el modelo de Sequelize/Mongoose se inyecta
  }

  async crear(datos) {
    return this.model.create(datos);
  }

  async obtenerTodos() {
    return this.model.findAll();     // con Mongoose sería find()
  }

  async buscarPorEmail(email) {
    return this.model.findOne({ where: { email } });
  }
}

module.exports = UsuarioRepository;
```

Uso:

```js
const Usuario = require('../models/Usuario');
const UsuarioRepository = require('../repositories/UsuarioRepository');

const repositorio = new UsuarioRepository(Usuario);
await repositorio.crear({ nombre: 'Ana', email: 'ana@example.com' });
const usuarios = await repositorio.obtenerTodos();
```

## Servicio que depende del repositorio

```js
// services/UsuarioService.js
class UsuarioService {
  constructor(repositorio) {
    this.repositorio = repositorio;
  }

  async registrar({ nombre, email }) {
    const existente = await this.repositorio.buscarPorEmail(email);
    if (existente) {
      const error = new Error('El email ya está registrado');
      error.status = 409;
      throw error;
    }
    return this.repositorio.crear({ nombre, email });
  }
}

module.exports = UsuarioService;
```

```js
// controllers/usuarioController.js
const service = new UsuarioService(new UsuarioRepository(Usuario));

exports.registrar = async (req, res) => {
  const usuario = await service.registrar(req.body);
  res.status(201).json(usuario);        // el error 409 llega al manejador central
};
```

## Un repositorio en memoria para pruebas

Como el servicio solo conoce los métodos del repositorio, puedes probarlo sin base de datos:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');

class UsuarioRepositoryMemoria {
  constructor() { this.usuarios = []; }
  async crear(datos) { this.usuarios.push(datos); return datos; }
  async buscarPorEmail(email) { return this.usuarios.find((u) => u.email === email) ?? null; }
}

test('no permite registrar dos veces el mismo email', async () => {
  const service = new UsuarioService(new UsuarioRepositoryMemoria());
  await service.registrar({ nombre: 'Ana', email: 'ana@example.com' });

  await assert.rejects(
    () => service.registrar({ nombre: 'Otra', email: 'ana@example.com' }),
    { message: 'El email ya está registrado' }
  );
});
```

## Cuándo NO merece la pena

Los ORM/ODM ya son una abstracción de la base de datos. En aplicaciones pequeñas, añadir repositorios puede ser **capas sin valor**. Considéralo cuando:

- La lógica de negocio es compleja y quieres probarla de forma aislada.
- Es probable que cambies de base de datos o de ORM.
- Las mismas consultas se repiten en muchos sitios.

## Puntos clave

- El repositorio expone operaciones de dominio y esconde el ORM.
- Se **inyecta** en los servicios, lo que permite sustituirlo en las pruebas.
- Úsalo cuando aporte desacoplamiento real; no por defecto en proyectos diminutos.

**Siguiente sección:** [Despliegue y escalabilidad](../06-despliegue-y-escalabilidad/01-preparar-para-produccion.md)
