---
title: "PostgreSQL con Sequelize"
description: "Usar PostgreSQL desde Node.js con el ORM Sequelize: conexión, modelos, migraciones con sequelize-cli, CRUD, operadores, paginación y relaciones."
section: bases-de-datos
order: 4
level: intermedio
tags: [postgresql, sequelize, orm, migraciones, sql, crud]
prerequisites: [03-mongodb-mongoose]
tested_on: "Sequelize 6.37 · sequelize-cli 6.6 · pg 8 · PostgreSQL 17"
---

# PostgreSQL con Sequelize

**PostgreSQL** es una base de datos relacional de código abierto muy robusta. **Sequelize** es un ORM para bases de datos SQL en Node.js (PostgreSQL, MySQL, MariaDB, SQLite, SQL Server): permite definir tablas como modelos JavaScript y consultar sin escribir SQL a mano.

## Instalación

1. Instala PostgreSQL (postgresql.org o, en desarrollo, Docker). Necesitarás un usuario y una contraseña.
2. Herramientas gráficas útiles: **pgAdmin** o **DBeaver**.
3. Crea la base de datos:

   ```bash
   psql -U postgres
   ```

   ```sql
   CREATE DATABASE mi_base_de_datos;
   ```

   O con Docker:

   ```bash
   docker run -d --name pg -e POSTGRES_PASSWORD=secreto -e POSTGRES_DB=mi_base_de_datos -p 5432:5432 postgres:17
   ```

4. Instala los paquetes de Node.js:

   ```bash
   npm install sequelize pg pg-hstore
   ```

   - `sequelize`: el ORM.
   - `pg`: el *driver* de PostgreSQL.
   - `pg-hstore`: serialización de datos JSON/hstore para PostgreSQL.

## Conexión

```js
// src/config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  // p. ej. postgres://postgres:secreto@localhost:5432/mi_base_de_datos
  dialect: 'postgres',
  logging: false,          // pon console.log para ver el SQL generado
});

async function conectarDB() {
  await sequelize.authenticate();       // comprueba que la conexión funciona
  console.log('PostgreSQL conectado');
}

module.exports = { sequelize, conectarDB };
```

También puedes pasar los datos por separado:

```js
new Sequelize('mi_base_de_datos', 'postgres', 'secreto', { host: 'localhost', dialect: 'postgres' });
```

> Para practicar sin instalar PostgreSQL, Sequelize funciona igual con SQLite en memoria (`npm install sqlite3`): `new Sequelize({ dialect: 'sqlite', storage: ':memory:' })`. Los ejemplos de esta página se probaron contra PostgreSQL 17 (salvo `Op.iLike`, que es específico de PostgreSQL).

## Modelos

```js
// src/models/Usuario.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Usuario = sequelize.define(
  'Usuario',
  {
    nombre: { type: DataTypes.STRING, allowNull: false },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    edad: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
  },
  {
    tableName: 'usuarios',
    timestamps: true,        // createdAt y updatedAt
  }
);

module.exports = Usuario;
```

`sequelize.define` crea automáticamente la columna `id` (clave primaria autoincremental). Tipos frecuentes: `STRING`, `TEXT`, `INTEGER`, `FLOAT`, `BOOLEAN`, `DATE`, `JSON`, `UUID`, `ENUM`.

### `sync` frente a migraciones

`await sequelize.sync()` crea las tablas que no existan a partir de los modelos. Es cómodo para aprender, pero **no debe usarse para evolucionar el esquema en producción** (`sync({ alter: true })` puede alterar o perder datos). Para eso están las **migraciones**.

## Migraciones con `sequelize-cli`

Una **migración** es un script versionado que describe un cambio en la estructura de la base de datos (con su operación inversa). Permite que todo el equipo y todos los entornos tengan el mismo esquema y que los cambios sean reversibles.

```bash
npm install --save-dev sequelize-cli
npx sequelize-cli init
```

`init` crea las carpetas `config/`, `models/`, `migrations/` y `seeders/`.

> **Atención:** el fichero `config/config.json` que genera `init` viene configurado con el dialecto **`mysql`**. Cámbialo a `postgres` (y ajusta usuario, contraseña, base de datos y host) o configúralo para leer una variable de entorno.

Genera y edita una migración:

```bash
npx sequelize-cli migration:generate --name create-usuarios
```

```js
// migrations/2026XXXXXXXXXX-create-usuarios.js
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('usuarios', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      nombre: { allowNull: false, type: Sequelize.STRING },
      email: { allowNull: false, unique: true, type: Sequelize.STRING },
      edad: { allowNull: false, type: Sequelize.INTEGER },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuarios');
  },
};
```

Comandos habituales:

```bash
npx sequelize-cli db:migrate              # aplica las migraciones pendientes
npx sequelize-cli db:migrate:status       # muestra cuáles están aplicadas
npx sequelize-cli db:migrate:undo         # revierte la última migración
npx sequelize-cli db:migrate:undo:all     # revierte todas
```

También hay `model:generate` para crear a la vez un modelo y su migración:

```bash
npx sequelize-cli model:generate --name Usuario --attributes nombre:string,email:string
```

## CRUD

```js
const Usuario = require('../models/Usuario');

// CREATE
const u = await Usuario.create({ nombre: 'Ana', email: 'ana@example.com', edad: 30 });
console.log(u.toJSON());
await Usuario.bulkCreate([{ ... }, { ... }]);       // varios a la vez

// READ
const todos = await Usuario.findAll();
const uno = await Usuario.findByPk(1);                            // por clave primaria
const porEmail = await Usuario.findOne({ where: { email: 'ana@example.com' } });

// UPDATE
await Usuario.update({ edad: 31 }, { where: { id: 1 } });         // devuelve [filasAfectadas]
// o sobre una instancia:
uno.edad = 31;
await uno.save();

// DELETE
const eliminados = await Usuario.destroy({ where: { id: 1 } });   // devuelve nº de filas borradas
```

## Filtros, orden y operadores

```js
const { Op } = require('sequelize');

const mayoresDe25 = await Usuario.findAll({ where: { edad: { [Op.gt]: 25 } } });

const rango = await Usuario.findAll({
  where: {
    edad: { [Op.gte]: 18, [Op.lte]: 65 },
    nombre: { [Op.like]: 'A%' },              // empieza por A (en PostgreSQL, Op.iLike ignora mayúsculas)
  },
  order: [['nombre', 'ASC']],
  attributes: ['id', 'nombre', 'email'],       // solo estas columnas
});
```

Operadores frecuentes: `Op.eq`, `Op.ne`, `Op.gt`, `Op.gte`, `Op.lt`, `Op.lte`, `Op.like`, `Op.iLike` (PostgreSQL), `Op.in`, `Op.notIn`, `Op.between`, `Op.or`, `Op.and`.

## Paginación

`findAndCountAll` devuelve el total y la página a la vez:

```js
async function listarUsuarios(page = 1, limit = 10) {
  const { count, rows } = await Usuario.findAndCountAll({
    limit,
    offset: (page - 1) * limit,
    order: [['id', 'ASC']],
  });
  return { total: count, page, paginas: Math.ceil(count / limit), datos: rows };
}
```

## Relaciones

```js
const Tarea = sequelize.define('Tarea', {
  titulo: { type: DataTypes.STRING, allowNull: false },
  completada: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'tareas' });

Usuario.hasMany(Tarea, { foreignKey: 'usuarioId' });     // 1:N
Tarea.belongsTo(Usuario, { foreignKey: 'usuarioId' });

// Cargar con sus tareas (JOIN)
const usuario = await Usuario.findOne({ where: { id: 1 }, include: Tarea });
console.log(usuario.Tareas.length);
```

Para N:M se usa `belongsToMany` con una tabla intermedia (`through`).

## Transacciones

Agrupan varias operaciones para que se apliquen **todas o ninguna** (propiedad de atomicidad):

```js
const t = await sequelize.transaction();
try {
  await Cuenta.decrement('saldo', { by: 100, where: { id: 1 }, transaction: t });
  await Cuenta.increment('saldo', { by: 100, where: { id: 2 }, transaction: t });
  await t.commit();
} catch (err) {
  await t.rollback();
  throw err;
}
```

## Errores habituales

| Error de Sequelize | Causa | Código HTTP sugerido |
|---|---|---|
| `SequelizeValidationError` | Incumple `allowNull`, `validate`… | 400 |
| `SequelizeUniqueConstraintError` | Valor duplicado en columna `unique` | 409 |
| `SequelizeForeignKeyConstraintError` | Referencia a un registro inexistente | 400/409 |
| `SequelizeConnectionError` | Sin conexión a la base de datos | 503 |

## Seguridad

- Los métodos del ORM (`findOne`, `findAll`, `where`…) **parametrizan** las consultas.
- Si usas SQL en bruto, utiliza `replacements`/`bind` y **nunca** concatenes texto del usuario (ver [Sanitización y validación](../03-seguridad/05-sanitizacion-y-validacion-entrada.md)).

## Puntos clave

- Instala `sequelize`, el driver `pg` y `pg-hstore`.
- Usa **migraciones** (`sequelize-cli`) para evolucionar el esquema; `sync` solo para pruebas.
- Cambia el dialecto por defecto (`mysql`) del `config.json` generado por `init`.
- `findAndCountAll` + `limit`/`offset` para paginar; `Op` para filtros.

**Siguiente sección:** [Arquitectura](../05-arquitectura/01-monolito-vs-microservicios.md)
