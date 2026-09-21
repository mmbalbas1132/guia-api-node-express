---
title: "Bases de datos: SQL frente a NoSQL"
description: "Diferencias entre bases de datos relacionales y NoSQL, propiedades ACID y BASE, y criterios para elegir una."
section: bases-de-datos
order: 1
level: basico
tags: [sql, nosql, acid, base, postgresql, mongodb, eleccion]
prerequisites: [06-api-rest-crud]
tested_on: "Conceptual"
---

# Bases de datos: SQL frente a NoSQL

Una API casi siempre necesita **persistir** datos. Las bases de datos se dividen en dos grandes familias.

## Bases de datos relacionales (SQL)

Organizan los datos en **tablas** con filas y columnas. Cada tabla tiene un **esquema fijo** definido de antemano (nombre y tipo de cada columna). Las tablas se conectan mediante **claves primarias** y **claves foráneas**, y se consultan con el lenguaje estándar **SQL**.

- Ejemplos: **PostgreSQL**, MySQL, Oracle, SQL Server.
- Fuertes en integridad y consistencia; ideales para relaciones complejas entre entidades.
- Transacciones **ACID**:
  - **A**tomicidad: la transacción se completa entera o no se aplica nada.
  - **C**onsistencia: los datos siempre pasan de un estado válido a otro válido.
  - **A**islamiento (*Isolation*): las transacciones concurrentes no interfieren entre sí.
  - **D**urabilidad: lo confirmado permanece aunque falle el sistema.

## Bases de datos NoSQL

Diseñadas para grandes volúmenes de datos, datos semiestructurados o esquemas cambiantes. Agrupan varios modelos: **documentos** (MongoDB, CouchDB), **clave-valor** (Redis), **columnas** (Cassandra) y **grafos**.

- Esquema **flexible**: por ejemplo, documentos JSON con campos distintos en cada uno.
- **Escalabilidad horizontal** sencilla y alto rendimiento de lectura/escritura.
- Suelen seguir el modelo **BASE** (*Basically Available, Soft state, Eventual consistency*): priorizan disponibilidad y aceptan **consistencia eventual** (los datos se sincronizan con un pequeño retraso).

## Comparativa

| Aspecto | SQL (relacional) | NoSQL |
|---|---|---|
| **Esquema** | Fijo, definido de antemano | Flexible, puede cambiar por documento |
| **Relaciones** | Fuertes (claves foráneas, normalización, *joins*) | Más simples o **embebidas** en el propio documento |
| **Escalabilidad** | Vertical principalmente (más potencia en el mismo servidor) | Horizontal (más servidores) |
| **Transacciones** | ACID | Consistencia eventual (BASE), aunque muchos ya ofrecen transacciones |
| **Consultas** | SQL estándar | Lenguajes o APIs propios de cada motor |
| **Casos típicos** | Finanzas, ERP, inventario, reservas | Redes sociales, catálogos, contenido, caché, datos en tiempo real |

> **Matiz:** las fronteras se difuminan. PostgreSQL admite columnas JSON, y MongoDB admite transacciones multi-documento. Elige por el problema, no por la moda.

## Cómo elegir

| Criterio | Inclina hacia SQL | Inclina hacia NoSQL |
|---|---|---|
| **Estructura de los datos** | Fija y con muchas relaciones | Semiestructurada o cambiante |
| **Escalabilidad** | Demanda moderada | Muy alta, con reparto horizontal |
| **Consistencia** | Transacciones complejas, integridad crítica | Se tolera consistencia eventual |
| **Rendimiento** | Consultas complejas con *joins* | Lecturas/escrituras masivas sobre documentos |
| **Mantenimiento** | Ecosistema muy maduro y estándar | Flexibilidad al evolucionar el modelo |

Escenarios orientativos:

- **Sistema financiero, contabilidad, reservas** → SQL (PostgreSQL): la integridad y las transacciones son críticas.
- **Red social, mensajería, catálogo de productos heterogéneos** → NoSQL (MongoDB): volumen alto y estructura variable.
- **CMS, aplicación de gestión** → depende de la estructura y del volumen; ambos funcionan.

En esta guía se aprende una de cada familia:

- [MongoDB con Mongoose](03-mongodb-mongoose.md) (documentos).
- [PostgreSQL con Sequelize](04-postgresql-sequelize.md) (relacional).

## ORM y ODM

En lugar de escribir consultas a mano, en Node.js se suele usar una capa de abstracción:

- **ODM** (*Object-Document Mapper*) para bases de documentos: **Mongoose** para MongoDB.
- **ORM** (*Object-Relational Mapper*) para SQL: **Sequelize** (también existen Prisma, TypeORM, Knex como *query builder*).

Permiten definir modelos con validaciones y trabajar con objetos JavaScript, y (bien usadas) parametrizan las consultas, lo que protege de la inyección.

## Puntos clave

- SQL: esquema fijo, relaciones, ACID. NoSQL: esquema flexible, escalado horizontal, consistencia eventual.
- Elige según la estructura de tus datos, la consistencia que necesitas y la escala prevista.
- Un ORM/ODM simplifica el acceso a datos desde Node.js.

**Siguiente:** [Modelado de datos](02-modelado-de-datos.md)
