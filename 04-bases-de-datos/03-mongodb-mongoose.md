---
title: "MongoDB con Mongoose"
description: "Conectar Node.js con MongoDB usando Mongoose: esquemas, modelos, CRUD, validaciones, filtros, paginación e índices."
section: bases-de-datos
order: 3
level: intermedio
tags: [mongodb, mongoose, odm, crud, paginacion, indices]
prerequisites: [02-modelado-de-datos]
tested_on: "Mongoose 9.10 · MongoDB 8 · Node.js 22"
---

# MongoDB con Mongoose

**MongoDB** es una base de datos NoSQL orientada a documentos (JSON/BSON). **Mongoose** es el ODM más usado para trabajar con ella desde Node.js: aporta esquemas, validación, middleware y una API cómoda.

## Instalar MongoDB

Dos opciones:

1. **Local:** MongoDB Community Server (descarga desde mongodb.com). Por defecto escucha en `mongodb://127.0.0.1:27017`.
2. **Nube:** **MongoDB Atlas**, el servicio gestionado de MongoDB, que ofrece un nivel gratuito para aprender. Te da una cadena de conexión del tipo `mongodb+srv://usuario:clave@cluster.xxxx.mongodb.net/mibase`.
3. **Docker** (útil en desarrollo): `docker run -d -p 27017:27017 --name mongo mongo:8`.

```bash
npm install mongoose
```

## Conexión

```js
// src/config/db.js
const mongoose = require('mongoose');

async function conectarDB() {
  await mongoose.connect(process.env.MONGODB_URI);   // p. ej. mongodb://127.0.0.1:27017/mi_base
  console.log('MongoDB conectado');
}

module.exports = { conectarDB };
```

> **Aviso:** las opciones `useNewUrlParser` y `useUnifiedTopology` que aparecen en muchos tutoriales antiguos **ya no son necesarias y con las versiones actuales provocan un error** (`MongoParseError: options usenewurlparser, useunifiedtopology are not supported`, comprobado con Mongoose 9). Basta con la URI.

Conecta **antes** de empezar a aceptar peticiones y termina el proceso si falla:

```js
conectarDB()
  .then(() => app.listen(port))
  .catch((err) => { console.error(err); process.exit(1); });
```

## Esquemas y modelos

Un **esquema** define la forma de los documentos, los tipos y las validaciones. Un **modelo** es la clase construida a partir del esquema y con la que se consulta la colección.

```js
// src/models/Usuario.js
const { Schema, model } = require('mongoose');

const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    edad: { type: Number, min: [0, 'La edad no puede ser negativa'] },
    rol: { type: String, enum: ['usuario', 'admin'], default: 'usuario' },
    password: { type: String, required: true, select: false },   // oculto por defecto
  },
  { timestamps: true }        // añade createdAt y updatedAt automáticamente
);

module.exports = model('Usuario', usuarioSchema);   // colección "usuarios"
```

Opciones útiles por campo: `required`, `unique`, `default`, `min`/`max`, `minlength`/`maxlength`, `enum`, `match` (regex), `trim`, `lowercase`, `select: false` y `validate` (función propia).

> **`unique` no es una validación**: crea un **índice único** en MongoDB. Al duplicar un valor, el error llega desde la base de datos con `err.code === 11000` (tradúcelo a `409 Conflict` en tu manejador de errores).

### Métodos, virtuales y *hooks*

```js
usuarioSchema.methods.saludar = function () {          // método de instancia
  return `Hola, soy ${this.nombre}`;
};

usuarioSchema.virtual('esMayor').get(function () {     // propiedad calculada (no se guarda)
  return this.edad >= 18;
});

usuarioSchema.pre('save', function () {                // hook: se ejecuta antes de guardar
  this.nombre = this.nombre.trim();
});
```

## CRUD

Todas las operaciones devuelven promesas: úsalas con `async/await`.

```js
const Usuario = require('../models/Usuario');

// CREATE
const u = await Usuario.create({ nombre: 'Ana', email: 'ana@example.com', edad: 30 });
// o: const u = new Usuario({ ... }); await u.save();

// READ
const todos = await Usuario.find();                       // todos
const uno = await Usuario.findById(id);                   // por _id
const porEmail = await Usuario.findOne({ email: 'ana@example.com' });

// UPDATE (devuelve el documento actualizado con returnDocument: 'after')
const actualizado = await Usuario.findByIdAndUpdate(
  id,
  { edad: 31 },
  { returnDocument: 'after', runValidators: true }
);

// DELETE
const borrado = await Usuario.findByIdAndDelete(id);      // devuelve el documento borrado (o null)
await Usuario.deleteMany({ edad: { $lt: 18 } });
```

Detalles importantes:

- `runValidators: true` hace que las **actualizaciones** también apliquen las validaciones del esquema (por defecto solo se validan `save()` y `create()`).
- Si el recurso no existe, `findById` y `findByIdAndUpdate` devuelven `null`: responde con `404`.
- Un `id` con formato inválido lanza un `CastError`: valídalo antes (`isMongoId()`) o tradúcelo a `400`.
- Para no enviar datos que no deben salir, usa `select`:

  ```js
  await Usuario.find().select('nombre email -_id');
  ```

## Filtros y operadores

```js
// Rango con $gte / $lte
const adultos = await Usuario.find({ edad: { $gte: 18, $lte: 65 } });

// Búsqueda insensible a mayúsculas con RegExp
const conAn = await Usuario.find({ nombre: new RegExp('an', 'i') });

// Otros operadores: $gt, $lt, $ne, $in, $nin, $or, $and, $exists
const filtrados = await Usuario.find({ $or: [{ rol: 'admin' }, { edad: { $gt: 60 } }] });

// Ordenar: 1 ascendente, -1 descendente
const recientes = await Usuario.find().sort({ createdAt: -1 });
```

> **Seguridad:** cuando construyas una expresión regular con texto del usuario, **escápalo** (`texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) para evitar ReDoS y coincidencias no deseadas. Y no pases `req.body`/`req.query` sin validar a un filtro: ver [inyección NoSQL](../03-seguridad/05-sanitizacion-y-validacion-entrada.md).

## Paginación

Se combina `skip` y `limit` con un recuento total:

```js
async function buscarUsuarios({ nombre, edadMin, edadMax, page = 1, limit = 10 }) {
  const filtro = {};
  if (nombre) filtro.nombre = new RegExp(nombre, 'i');
  if (edadMin !== undefined || edadMax !== undefined) {
    filtro.edad = {};
    if (edadMin !== undefined) filtro.edad.$gte = edadMin;
    if (edadMax !== undefined) filtro.edad.$lte = edadMax;
  }

  const [datos, total] = await Promise.all([
    Usuario.find(filtro)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),                              // devuelve objetos planos: más rápido y ligero
    Usuario.countDocuments(filtro),
  ]);

  return { datos, total, page, paginas: Math.ceil(total / limit) };
}
```

`.lean()` devuelve objetos JavaScript simples en lugar de documentos de Mongoose (sin métodos ni virtuales): recomendable en lecturas donde solo vas a enviar JSON.

> `skip` se vuelve lento con desplazamientos enormes. Para listados gigantes considera paginación por cursor (filtrar por `_id` o `createdAt` del último elemento).

## Relaciones: referencias y `populate`

```js
const tareaSchema = new Schema({
  titulo: String,
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
});
const Tarea = model('Tarea', tareaSchema);

// Sustituye el _id por los datos del usuario
const tarea = await Tarea.findOne().populate('usuario', 'nombre email');
console.log(tarea.usuario.nombre);
```

## Índices

Los índices aceleran las consultas por los campos que más filtras u ordenas:

```js
tareaSchema.index({ usuario: 1, createdAt: -1 });     // índice compuesto
// o en el campo: { type: ObjectId, index: true }
```

Los índices consumen espacio y ralentizan las escrituras: crea solo los que uses.

## Agregaciones

Para cálculos y agrupaciones:

```js
const resumen = await Producto.aggregate([
  { $group: { _id: '$categoria', total: { $sum: 1 }, media: { $avg: '$precio' } } },
  { $sort: { _id: 1 } },
]);
```

## Manejo de errores típico

| Error | Causa | Código HTTP |
|---|---|---|
| `ValidationError` | Un valor incumple el esquema | 400 |
| `CastError` | `id` inválido o tipo incorrecto | 400 |
| `err.code === 11000` | Clave duplicada (índice único) | 409 |

Se traducen en el [manejador central de errores](../02-express/04-manejo-de-errores.md).

## Cerrar la conexión

En un apagado ordenado o al terminar los tests:

```js
await mongoose.disconnect();
```

## Puntos clave

- Conecta con `mongoose.connect(uri)`, sin opciones obsoletas.
- Esquema + modelo definen forma y validaciones; `unique` crea un índice, no valida.
- Usa `runValidators: true` en las actualizaciones y `.lean()` en lecturas de solo JSON.
- Pagina con `skip`/`limit` + `countDocuments`; indexa los campos de consulta.

**Siguiente:** [PostgreSQL con Sequelize](04-postgresql-sequelize.md)
