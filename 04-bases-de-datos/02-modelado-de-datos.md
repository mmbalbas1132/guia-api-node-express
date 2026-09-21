---
title: "Modelado de datos"
description: "Entidades, atributos y relaciones (1:1, 1:N, N:M), normalización y desnormalización, con ejemplos en SQL y MongoDB."
section: bases-de-datos
order: 2
level: basico
tags: [modelado, entidades, relaciones, normalizacion, er]
prerequisites: [01-conceptos-sql-vs-nosql]
tested_on: "Conceptual"
---

# Modelado de datos

Antes de escribir código conviene **diseñar cómo se guardarán los datos**. Un buen modelo evita duplicidades, facilita las consultas y hace más fácil evolucionar la aplicación.

## Conceptos básicos

- **Entidad**: un objeto del mundo real que interesa guardar (usuario, tarea, producto). En SQL será una **tabla**; en MongoDB, una **colección** de documentos.
- **Atributo**: una propiedad de la entidad (nombre, email, fecha de creación). En SQL es una **columna**; en MongoDB, un **campo**.
- **Relación**: cómo se conectan las entidades.

## Tipos de relaciones

| Relación | Significado | Ejemplo |
|---|---|---|
| **1:1** (uno a uno) | Un registro de A se relaciona con uno solo de B | Usuario ↔ Perfil |
| **1:N** (uno a muchos) | Un registro de A se relaciona con muchos de B | Un usuario tiene **muchas** tareas |
| **N:M** (muchos a muchos) | Muchos de A con muchos de B | Estudiantes ↔ Cursos, Tareas ↔ Etiquetas |

### En SQL

- **1:1**: la tabla `perfiles` tiene una clave foránea `usuario_id` **única** que apunta a `usuarios.id`.
- **1:N**: la tabla del lado «muchos» (`tareas`) guarda la clave foránea (`usuario_id`).
- **N:M**: se necesita una **tabla intermedia** (`tarea_etiquetas`) con las dos claves foráneas.

```sql
CREATE TABLE usuarios (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email  TEXT NOT NULL UNIQUE
);

CREATE TABLE tareas (
  id          SERIAL PRIMARY KEY,
  titulo      TEXT NOT NULL,
  completada  BOOLEAN NOT NULL DEFAULT FALSE,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE etiquetas (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE tarea_etiquetas (        -- tabla intermedia N:M
  tarea_id    INTEGER REFERENCES tareas(id)    ON DELETE CASCADE,
  etiqueta_id INTEGER REFERENCES etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (tarea_id, etiqueta_id)
);
```

### En MongoDB: referenciar o embeber

Como no hay *joins* obligatorios, hay dos estrategias:

```js
// 1) REFERENCIAR (similar a SQL): la tarea guarda el _id del usuario
{ _id: ObjectId('…'), titulo: 'Estudiar', usuario: ObjectId('…') }
// se recupera con populate() en Mongoose

// 2) EMBEBER: los datos relacionados viven dentro del documento
{
  _id: ObjectId('…'),
  nombre: 'Ana',
  direcciones: [
    { calle: 'Mayor 1', ciudad: 'Madrid' },
    { calle: 'Sol 5', ciudad: 'Sevilla' }
  ]
}
```

| Estrategia | Cuándo | Ventaja | Inconveniente |
|---|---|---|---|
| **Embeber** | Los datos se leen siempre juntos y son pocos y acotados | Una sola lectura | Documentos que crecen; duplicación |
| **Referenciar** | Datos grandes, que crecen o se usan por separado | Sin duplicidad | Más consultas (`populate`) |

## Normalización y desnormalización

- **Normalizar** (típico en SQL): dividir los datos en varias tablas para **eliminar la redundancia** y mantener la integridad. Un dato se guarda en un solo sitio; actualizar es sencillo.
- **Desnormalizar** (frecuente en NoSQL): **duplicar** datos a propósito para acelerar las lecturas, a costa de tener que actualizar varias copias.

## Proceso de modelado

1. **Identifica las entidades** del problema (¿qué «cosas» manejo?).
2. **Define los atributos** de cada una, su tipo y cuáles son obligatorios o únicos.
3. **Establece las relaciones** y su cardinalidad (1:1, 1:N, N:M).
4. **Decide claves**: primaria (identifica de forma única), foráneas (conectan tablas), índices (aceleran consultas).
5. **Normaliza** (SQL) o decide **embeber/referenciar** (MongoDB) según cómo vayas a consultar.
6. Piensa en las **consultas más frecuentes** y ajusta el modelo para que sean eficientes.

## Ejemplo: modelo de la API de tareas

```text
Usuario 1 ───────< Tarea
  id, nombre,        id, titulo, descripcion,
  email, password,   completada, usuario (FK/ref),
  rol                createdAt, updatedAt
```

Un usuario tiene muchas tareas (1:N); cada tarea pertenece a un solo usuario. Este es el modelo que se implementa en el [proyecto completo](../08-proyecto-api-tareas/01-diseno-y-planificacion.md), primero con MongoDB.

## Puntos clave

- Entidades, atributos, relaciones: el vocabulario común del modelado.
- 1:N → clave foránea en el lado «muchos»; N:M → tabla intermedia.
- En MongoDB, elige entre embeber y referenciar según cómo se lean los datos.

**Siguiente:** [MongoDB con Mongoose](03-mongodb-mongoose.md)
