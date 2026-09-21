---
title: "Guía de Node.js y Express"
description: "Guía completa en Markdown para aprender a desarrollar APIs con Node.js y Express: fundamentos, Express 5, seguridad, bases de datos, arquitectura, despliegue, tiempo real, calidad y un proyecto completo."
section: indice
order: 0
level: basico
tags: [nodejs, express, api-rest, guia, indice]
prerequisites: []
tested_on: "Node.js 22 y 24 · Express 5.2 · Mongoose 9 · Sequelize 6 · MongoDB 8 · PostgreSQL 17"
---

# Guía de Node.js y Express

Guía práctica para aprender a construir **APIs con Node.js y Express**, desde los fundamentos hasta el despliegue y el mantenimiento, con un **proyecto completo** que reúne todo lo aprendido. Está escrita en español, dividida en 51 páginas breves y autocontenidas.

**Principios de la guía**

- **Contenido original y verificado.** Las explicaciones están redactadas con palabras propias y contrastadas con la documentación oficial vigente de Node.js, Express y de cada herramienta. Los ejemplos de código **se ejecutaron** (scripts de Node.js, servidores Express, MongoDB, PostgreSQL, Redis, Docker, NGINX, Swagger en el navegador…). Cada página indica en su cabecera con qué versiones se comprobó (`tested_on`), y cuando algo no se pudo ejecutar (por ejemplo, comandos de plataformas externas) lo dice expresamente.
- **Versiones actuales.** Se usa Express 5, Mongoose 9 y una versión LTS reciente de Node.js. Donde los tutoriales antiguos difieren, se señala ([Código obsoleto y errores frecuentes](10-referencias/04-codigo-obsoleto-y-errores-frecuentes.md)).
- **Modular.** Cada página cubre un tema, declara sus prerrequisitos y termina con **Puntos clave** y un enlace a la **siguiente** página.

## Qué vas a aprender

Al terminar la guía serás capaz de:

- **Entender Node.js por dentro:** el event loop, la asincronía, los módulos (CommonJS y ESM), los streams y el servidor HTTP nativo.
- **Construir una API REST con Express 5:** rutas, middleware, recepción de datos, códigos de estado, manejo de errores y validación de la entrada.
- **Proteger la API:** contraseñas con bcrypt, autenticación con JWT, autorización por roles, cabeceras con Helmet, CORS, límites de peticiones y defensa frente a inyecciones y XSS.
- **Persistir datos:** modelado, MongoDB con Mongoose y PostgreSQL con Sequelize, incluyendo relaciones, paginación e índices.
- **Organizar el código:** arquitectura por capas y MVC, principios SOLID y patrón repositorio.
- **Añadir calidad:** documentación OpenAPI con Swagger, registros con Winston, pruebas automáticas con `node:test` y Supertest, caché y rendimiento.
- **Llevarla a producción:** lista de comprobación previa, Docker, plataformas de despliegue y escalado con cluster, PM2 y NGINX.
- **Entregar un proyecto completo:** la [API de tareas](#proyecto-final-api-de-tareas), del diseño a las pruebas.

## Requisitos previos

**Conocimientos.** Basta con JavaScript moderno a nivel básico: variables, funciones, arrays y objetos, desestructuración, funciones flecha y clases. Conviene tener nociones de HTTP (métodos, códigos de estado) y saber moverte por la terminal. **No hace falta experiencia previa con Node.js:** la guía empieza desde cero.

**Herramientas.**

| Herramienta | Necesaria | Para qué |
|---|---|---|
| [Node.js 22 o superior](https://nodejs.org) (LTS) y npm | Sí | Ejecutar todos los ejemplos |
| Editor de código (VS Code, WebStorm…) | Sí | Escribir y navegar el código |
| Git | Sí | Clonar el repositorio |
| `curl` o un cliente HTTP (Postman, Insomnia, Bruno) | Sí | Probar los endpoints |
| [MongoDB](https://www.mongodb.com/try/download/community) 8 (local, Docker o Atlas) | Secciones 4 y 8 | Base de datos del proyecto final |
| [PostgreSQL](https://www.postgresql.org/download/) 17 | Sección 4 | Ejemplos con Sequelize |
| [Docker](https://docs.docker.com/get-docker/) y Docker Compose | Secciones 6 y 8 | Empaquetar y levantar el entorno |
| [Redis](https://redis.io/download) | Sección 9 | Ejemplos de caché |

Las herramientas marcadas por sección son opcionales: puedes leer la guía entera sin instalarlas, y las pruebas del proyecto final funcionan **sin MongoDB** (usan una base de datos en memoria).

## Cómo leerla

| Si quieres… | Ruta |
|---|---|
| Aprender desde cero | Secciones 01 → 10 en orden |
| Construir tu primera API cuanto antes | 01 (páginas 1-4, 6-7) → 02 (1-6) → 04 (3) → 08 |
| Ya conoces Node.js y quieres Express 5 | 02 (empezando por [Express 5: novedades](02-express/09-express-5-novedades-y-migracion.md)) → 03 → 08 |
| Preparar una API para producción | 03 → 06 → 09 |
| Consultar un concepto | [Glosario](10-referencias/03-glosario.md) |

## Cómo usar la guía

Clona el repositorio y lee los ficheros Markdown en tu editor o directamente en GitHub:

```bash
git clone https://github.com/mmbalbas1132/guia-api-node-express.git guia-api-node-express
cd guia-api-node-express
```

Empieza por [`01-fundamentos/01-que-es-nodejs.md`](01-fundamentos/01-que-es-nodejs.md) y sigue el enlace **Siguiente** del final de cada página: enlazan todas las páginas en orden, de la primera a la última.

Para ejecutar el proyecto final:

```bash
cd ejemplos/api-tareas
npm install
cp .env.example .env        # edita JWT_SECRET y MONGODB_URI
npm test                    # 15 pruebas, no necesita MongoDB
npm run dev                 # arranca la API en http://localhost:3000
```

> **Consejo:** escribe el código a mano en lugar de copiarlo, y pégalo solo para comparar. Cada página es corta a propósito para que puedas ejecutar lo que lees antes de pasar a la siguiente.

## Índice

### 1. Fundamentos de Node.js

Qué es Node.js, su modelo asíncrono, módulos, ficheros, streams, servidor HTTP nativo, configuración y `fetch`.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [¿Qué es Node.js?](01-fundamentos/01-que-es-nodejs.md) | Básico | Qué es Node.js, cómo funciona su modelo de ejecución y cuándo conviene usarlo. |
| 2 | [Instalación y entorno de trabajo](01-fundamentos/02-instalacion-y-entorno.md) | Básico | Instalar Node.js LTS, preparar las herramientas de desarrollo y ejecutar tu primer script. |
| 3 | [npm y package.json](01-fundamentos/03-npm-y-package-json.md) | Básico | Gestión de dependencias con npm: package.json, versionado semántico, scripts y buenas prácticas. |
| 4 | [Módulos: CommonJS y ES Modules](01-fundamentos/04-modulos-commonjs-esm.md) | Básico | Cómo organizar el código en módulos con require/module.exports y con import/export. |
| 5 | [El sistema de archivos (fs y path)](01-fundamentos/05-sistema-de-archivos.md) | Básico | Leer, escribir y gestionar ficheros y carpetas con los módulos fs y path, en sus tres variantes. |
| 6 | [Event loop y asincronía](01-fundamentos/06-event-loop-y-asincronia.md) | Intermedio | Cómo Node.js gestiona operaciones bloqueantes y no bloqueantes: el event loop, nextTick, setImmediate y EventEmitter. |
| 7 | [Callbacks, promesas y async/await](01-fundamentos/07-callbacks-promesas-async-await.md) | Intermedio | Los tres estilos de programación asíncrona en Node.js, cómo manejar errores en cada uno y cuándo usar Promise.all, allSettled, race y any. |
| 8 | [Streams y Buffers](01-fundamentos/08-streams-y-buffers.md) | Intermedio | Procesar datos por partes con streams (Readable, Writable, Transform) y trabajar con datos binarios mediante Buffer. |
| 9 | [Servidor HTTP nativo](01-fundamentos/09-servidor-http-nativo.md) | Intermedio | Anatomía de una transacción HTTP con el módulo node:http: request, response, cabeceras, cuerpo y enrutado manual. |
| 10 | [Configuración y variables de entorno](01-fundamentos/10-configuracion-y-variables-de-entorno.md) | Básico | Gestionar secretos y configuración con process.env, ficheros .env (--env-file, loadEnvFile) y NODE_ENV. |
| 11 | [Fetch: cliente HTTP integrado](01-fundamentos/11-fetch-cliente-http.md) | Básico | Hacer peticiones HTTP desde Node.js con fetch, manejar errores y timeouts. |

### 2. Express

Framework web: rutas, middleware, errores, recepción de datos, API REST, validación, estáticos y novedades de Express 5.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Introducción a Express e instalación](02-express/01-introduccion-e-instalacion.md) | Básico | Qué es Express, cómo instalarlo, tu primer servidor y la estructura básica de un proyecto. |
| 2 | [Enrutado (routing)](02-express/02-routing.md) | Básico | Definir rutas en Express 5: métodos HTTP, parámetros, comodines, opcionales, varios handlers y express.Router. |
| 3 | [Middleware](02-express/03-middleware.md) | Intermedio | Qué es un middleware, tipos (aplicación, router, errores, integrado, terceros), orden de ejecución y cómo escribir el tuyo. |
| 4 | [Manejo de errores](02-express/04-manejo-de-errores.md) | Intermedio | Cómo captura Express los errores síncronos y asíncronos, el manejador por defecto y cómo escribir manejadores de errores propios. |
| 5 | [Recibir datos y responder (req y res)](02-express/05-recibir-datos-req-res.md) | Básico | Leer parámetros, query string, cuerpo y cabeceras de la petición, y construir respuestas con códigos de estado correctos. |
| 6 | [API REST con CRUD](02-express/06-api-rest-crud.md) | Intermedio | Principios de una API RESTful y un CRUD completo con Express: rutas, métodos HTTP, códigos de estado y validación. |
| 7 | [Validación con express-validator](02-express/07-validacion-con-express-validator.md) | Intermedio | Validar y sanear la entrada de las peticiones con express-validator: cadenas de validación, mensajes y middleware reutilizable. |
| 8 | [Archivos estáticos y plantillas](02-express/08-archivos-estaticos-y-plantillas.md) | Básico | Servir imágenes, CSS y JavaScript con express.static y nociones sobre motores de plantillas. |
| 9 | [Novedades de Express 5 y migración desde Express 4](02-express/09-express-5-novedades-y-migracion.md) | Intermedio | Cambios de Express 5 respecto a Express 4: rutas, promesas, req.body, req.query y métodos eliminados. |

### 3. Seguridad

Contraseñas, JWT, roles, cabeceras y CORS, sanitización y buenas prácticas de seguridad en Node.js.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Contraseñas seguras con bcrypt](03-seguridad/01-contrasenas-bcrypt.md) | Intermedio | Almacenar contraseñas con hash y salt usando bcrypt: registro, comparación en el login y errores habituales. |
| 2 | [Autenticación con JWT](03-seguridad/02-jwt.md) | Intermedio | Qué es un JSON Web Token, cómo firmarlo y verificarlo con jsonwebtoken y cómo protegerlo en Express con un middleware Bearer. |
| 3 | [Autorización por roles](03-seguridad/03-autorizacion-roles.md) | Intermedio | Restringir rutas según el rol del usuario con un middleware configurable y comprobar la propiedad de los recursos. |
| 4 | [Helmet, CORS y límites de uso](03-seguridad/04-helmet-cors-y-limites.md) | Intermedio | Cabeceras de seguridad con Helmet, control de orígenes con CORS, límite de tamaño del cuerpo y limitación de peticiones contra fuerza bruta. |
| 5 | [Sanitización y validación de entrada](03-seguridad/05-sanitizacion-y-validacion-entrada.md) | Intermedio | Defensa frente a inyecciones (SQL y NoSQL), XSS y otros ataques que aprovechan la entrada del usuario. |
| 6 | [Buenas prácticas de seguridad en Node.js](03-seguridad/06-buenas-practicas-seguridad-node.md) | Avanzado | Resumen de las recomendaciones oficiales de seguridad de Node.js y Express para producción: DoS, cadena de suministro, TLS, cookies y más. |

### 4. Bases de datos

SQL frente a NoSQL, modelado, MongoDB con Mongoose y PostgreSQL con Sequelize.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Bases de datos: SQL frente a NoSQL](04-bases-de-datos/01-conceptos-sql-vs-nosql.md) | Básico | Diferencias entre bases de datos relacionales y NoSQL, propiedades ACID y BASE, y criterios para elegir una. |
| 2 | [Modelado de datos](04-bases-de-datos/02-modelado-de-datos.md) | Básico | Entidades, atributos y relaciones (1:1, 1:N, N:M), normalización y desnormalización, con ejemplos en SQL y MongoDB. |
| 3 | [MongoDB con Mongoose](04-bases-de-datos/03-mongodb-mongoose.md) | Intermedio | Conectar Node.js con MongoDB usando Mongoose: esquemas, modelos, CRUD, validaciones, filtros, paginación e índices. |
| 4 | [PostgreSQL con Sequelize](04-bases-de-datos/04-postgresql-sequelize.md) | Intermedio | Usar PostgreSQL desde Node.js con el ORM Sequelize: conexión, modelos, migraciones con sequelize-cli, CRUD, operadores, paginación y relaciones. |

### 5. Arquitectura

Monolito y microservicios, SOLID, MVC por capas y patrón repositorio.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Monolito frente a microservicios](05-arquitectura/01-monolito-vs-microservicios.md) | Intermedio | Dos estilos de arquitectura backend: ventajas, inconvenientes y cuándo elegir cada uno. |
| 2 | [Principios SOLID](05-arquitectura/02-principios-solid.md) | Intermedio | Los cinco principios SOLID de diseño orientado a objetos explicados con ejemplos en JavaScript para código backend. |
| 3 | [MVC y arquitectura por capas](05-arquitectura/03-patron-mvc-y-capas.md) | Intermedio | El patrón Modelo-Vista-Controlador adaptado a una API con Express y la separación en rutas, controladores, servicios y modelos. |
| 4 | [Patrón repositorio](05-arquitectura/04-patron-repositorio.md) | Avanzado | Aislar el acceso a datos detrás de un repositorio para desacoplar la lógica de negocio de la base de datos y facilitar las pruebas. |

### 6. Despliegue y escalabilidad

Producción, plataformas, Docker, cluster, NGINX y PM2.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Preparar la aplicación para producción](06-despliegue-y-escalabilidad/01-preparar-para-produccion.md) | Intermedio | Lista de comprobación antes de desplegar: NODE_ENV, variables de entorno, apagado ordenado, health checks, logging, reinicios y systemd. |
| 2 | [Plataformas de despliegue](06-despliegue-y-escalabilidad/02-plataformas-de-despliegue.md) | Intermedio | Opciones para publicar una API Node.js: PaaS (Heroku), serverless (Vercel) y servidores virtuales (DigitalOcean con NGINX y PM2). |
| 3 | [Docker: empaquetar la aplicación](06-despliegue-y-escalabilidad/03-docker.md) | Intermedio | Crear una imagen Docker de una API Node.js, ejecutarla, y orquestarla con MongoDB mediante Docker Compose. |
| 4 | [Escalado: cluster, NGINX y PM2](06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md) | Avanzado | Escalabilidad vertical y horizontal, módulo cluster, balanceo de carga con NGINX, PM2 y worker threads. |

### 7. Tiempo real

WebSockets y Socket.io.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Tiempo real con WebSockets y Socket.io](07-tiempo-real/01-websockets-y-socketio.md) | Intermedio | Comunicación bidireccional en tiempo real: WebSockets frente a HTTP, servidor y cliente con Socket.io, salas, autenticación y casos de uso. |

### 8. Proyecto: API de tareas

Una API completa, del diseño a las pruebas, con el código real y ejecutable.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Proyecto: diseño y planificación de la API de tareas](08-proyecto-api-tareas/01-diseno-y-planificacion.md) | Intermedio | Antes de escribir código: objetivos, endpoints, modelo de datos, estructura de carpetas y decisiones de seguridad de la API de gestión de tareas que se construye en esta sección. |
| 2 | [Proyecto: implementación paso a paso](08-proyecto-api-tareas/02-implementacion-paso-a-paso.md) | Intermedio | Construcción completa de la API de tareas con Express 5, MongoDB, JWT, validación, Swagger, logs y Docker, con el código real y comprobado de cada fichero. |
| 3 | [Proyecto: probar la API](08-proyecto-api-tareas/03-probar-la-api.md) | Intermedio | Cómo probar la API de tareas: flujo completo con curl y token Bearer, Swagger UI, clientes gráficos y pruebas automáticas con node:test y Supertest. |

### 9. Calidad y mantenimiento

Swagger/OpenAPI, logging, pruebas, rendimiento y caché, mantenimiento.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Documentar la API con Swagger / OpenAPI](09-calidad-y-mantenimiento/01-documentacion-con-swagger.md) | Intermedio | Generar documentación interactiva de una API Express con swagger-jsdoc y swagger-ui-express: comentarios @openapi, esquemas reutilizables y autenticación Bearer. |
| 2 | [Logging con Winston](09-calidad-y-mantenimiento/02-logging-con-winston.md) | Intermedio | Registros estructurados en una API Express: niveles, formatos JSON, transportes (consola y ficheros), registro de peticiones con morgan o middleware propio, y alternativas como Pino. |
| 3 | [Pruebas automatizadas](09-calidad-y-mantenimiento/03-pruebas-automatizadas.md) | Intermedio | Estrategia y práctica de testing en Node.js: pirámide de pruebas, node:test, aserciones, dobles (mocks), cobertura, pruebas de API con Supertest y comparación con Jest. |
| 4 | [Rendimiento y caché](09-calidad-y-mantenimiento/04-rendimiento-y-cache.md) | Avanzado | Optimizar una API Node.js/Express: compresión, índices de base de datos, lean() y proyecciones, paginación, no bloquear el event loop y caché con Redis (cache-aside). |
| 5 | [Mantenimiento y buenas prácticas](09-calidad-y-mantenimiento/05-mantenimiento-y-buenas-practicas.md) | Intermedio | Mantener una API en el tiempo: dependencias y auditoría, versiones de Node.js, integración continua, convenciones de código, observabilidad y una lista de revisión. |

### 10. Referencias

Siguientes pasos, enlaces oficiales, glosario y código obsoleto.

| # | Página | Nivel | Contenido |
|---|---|---|---|
| 1 | [Siguientes pasos](10-referencias/01-siguientes-pasos.md) | Avanzado | Hoja de ruta para seguir avanzando tras la guía: caché y mensajería, GraphQL, microservicios, CI/CD, observabilidad, OAuth2/OpenID, TypeScript y formas de seguir practicando. |
| 2 | [Enlaces y documentación oficial](10-referencias/02-enlaces-oficiales.md) | Básico | Directorio de la documentación oficial de Node.js, Express, bases de datos, seguridad, despliegue y herramientas usadas en la guía, con qué encontrar en cada una. |
| 3 | [Glosario](10-referencias/03-glosario.md) | Básico | Definiciones breves de los términos clave de Node.js, Express, bases de datos, seguridad, arquitectura y despliegue usados en la guía, con enlace a la página donde se explican. |
| 4 | [Código obsoleto y errores frecuentes](10-referencias/04-codigo-obsoleto-y-errores-frecuentes.md) | Intermedio | Patrones antiguos que siguen apareciendo en tutoriales y libros (Node.js, Express 4, Mongoose, JWT, Docker, tests) con su equivalente actual y el motivo del cambio. |

## Proyecto final: API de tareas

La guía culmina en una **API REST de gestión de tareas** completa y ejecutable, construida paso a paso en la [sección 8](#8-proyecto-api-de-tareas). El código vive en [`ejemplos/api-tareas`](ejemplos/api-tareas/README.md).

**Qué incluye**

- Registro y login con contraseñas cifradas mediante hash (bcrypt) y **tokens JWT**.
- CRUD de tareas por usuario, con **paginación**, filtros y comprobación de propiedad del recurso.
- **Autorización por roles**: el endpoint `/usuarios` exige rol `admin`.
- Validación de la entrada con express-validator y manejador de errores centralizado.
- Seguridad HTTP: Helmet, CORS configurable, límite de tamaño del cuerpo y limitación de peticiones.
- **Documentación interactiva** en `/api-docs` (Swagger UI) y registros estructurados con Winston.
- **15 pruebas automáticas** que pasan, con `node:test`, Supertest y MongoDB en memoria.
- `Dockerfile` y `docker-compose.yml` para levantar API y base de datos con un comando.

**Ponerlo en marcha**

```bash
cd ejemplos/api-tareas
npm install
cp .env.example .env
npm test                            # verifica que todo funciona
npm run dev
curl http://localhost:3000/salud    # {"estado":"ok"}
```

O con Docker, sin instalar MongoDB:

```bash
cd ejemplos/api-tareas
export JWT_SECRET=un-secreto-largo-y-aleatorio
docker compose up -d --build
```

Los detalles de configuración, variables de entorno y endpoints están en el [README del proyecto](ejemplos/api-tareas/README.md).

## Estructura del repositorio

```text
.
├── 01-fundamentos/                 11 páginas · Node.js desde cero
├── 02-express/                      9 páginas · Express 5
├── 03-seguridad/                    6 páginas · bcrypt, JWT, roles, Helmet
├── 04-bases-de-datos/               4 páginas · Mongoose y Sequelize
├── 05-arquitectura/                 4 páginas · SOLID, MVC, repositorio
├── 06-despliegue-y-escalabilidad/   4 páginas · producción, Docker, PM2
├── 07-tiempo-real/                  1 página  · WebSockets y Socket.io
├── 08-proyecto-api-tareas/          3 páginas · el proyecto final
├── 09-calidad-y-mantenimiento/      5 páginas · Swagger, logs, tests, caché
├── 10-referencias/                  4 páginas · glosario, enlaces, errores
├── ejemplos/
│   └── api-tareas/                 código ejecutable del proyecto final
│       ├── src/                    config · models · middlewares
│       │                           controllers · routes · docs
│       ├── tests/                  15 pruebas con node:test y Supertest
│       ├── Dockerfile
│       └── docker-compose.yml
├── LICENSE                         GPL-3.0
└── README.md                       esta página
```

## Versiones de referencia

Comprobadas con `npm view` el 21 de septiembre de 2026:

| Componente | Versión |
|---|---|
| Node.js (LTS) | 24 (los ejemplos se ejecutaron también en 22) |
| Express | 5.2.1 |
| Mongoose | 9.10 |
| Sequelize / sequelize-cli / pg | 6.37 / 6.6 / 8.23 |
| bcrypt · jsonwebtoken | 6.0 · 9.0 |
| Helmet · cors · express-rate-limit | 8.3 · 2.8 · 8.7 |
| express-validator | 7.3 |
| Socket.io | 4.8 |
| swagger-jsdoc · swagger-ui-express | 6.3 · 5.0 |
| Winston · compression | 3.19 · 1.8 |
| Supertest · mongodb-memory-server | 7.2 · 11.2 |
| Redis (cliente) | 6.2 |
| PM2 | 7.0 |

Las versiones cambian: antes de usarla en un proyecto real, comprueba las vigentes con `npm outdated` y la documentación oficial ([Enlaces oficiales](10-referencias/02-enlaces-oficiales.md)).

## Convenciones de los documentos

Esta sección describe el formato, útil si vas a procesar los ficheros (por ejemplo, para generar una web).

### Estructura de carpetas y nombres

- Una carpeta por sección (`NN-nombre`) y un fichero por página (`NN-nombre.md`), ordenados por el prefijo numérico.
- Nombres en minúsculas, sin acentos, con guiones.
- Los enlaces entre páginas son **rutas relativas a ficheros `.md`** (por ejemplo, `../03-seguridad/02-jwt.md`), con `#ancla` opcional. Al generar la web, sustitúyelos por tus rutas.
- Los ficheros de código completos del proyecto están en `ejemplos/`.

### Cabecera (front-matter YAML)

Todas las páginas empiezan con:

```yaml
---
title: "Título de la página"
description: "Resumen de una frase"
section: fundamentos          # fundamentos | express | seguridad | bases-de-datos | arquitectura
                              # | despliegue | tiempo-real | proyecto | calidad | referencias
order: 1                      # posición dentro de la sección
level: basico                 # basico | intermedio | avanzado
tags: [nodejs, npm]           # etiquetas para búsqueda y filtros
prerequisites: [02-otra-pagina]   # nombres de fichero (sin .md) que conviene haber leído antes
tested_on: "Node.js 22 · Express 5.2"   # con qué se verificó el contenido
---
```

### Cuerpo

- Un único `#` (título) por página; el contenido usa `##` y `###`.
- **Bloques de código** con lenguaje indicado (`js`, `bash`, `json`, `yaml`, `dockerfile`, `nginx`, `sql`, `html`, `text`…). Los ejemplos de JavaScript usan **CommonJS** salvo indicación.
- **Avisos** como citas con etiqueta en negrita: `> **Nota:** …`, `> **Aviso:** …`, `> **Consejo:** …`, `> **Importante:** …`, `> **Seguridad:** …`, `> **Alternativa:** …`. Se pueden mostrar como bloques destacados en la web.
- **Tablas** para comparativas y referencias rápidas.
- **Listas de comprobación** con `- [ ]` en las páginas de seguridad, producción y mantenimiento.
- Cada página termina con **Puntos clave** y `**Siguiente:** [...]` (o `**Siguiente sección:** [...]`).
- Los comentarios de los ejemplos de código están en español.

## Sobre el contenido

- Todo el texto es una redacción original en español, no una copia de otras obras, y se ha validado con la documentación oficial de Node.js y Express (nodejs.org y expressjs.com) y de las demás herramientas.
- Cuando el material de partida usaba prácticas o versiones desfasadas, se han actualizado y se han documentado las diferencias.
- Los comandos de plataformas de terceros (Heroku, Vercel, DigitalOcean…) son una guía de referencia y **no se ejecutaron**: consulta siempre su documentación vigente.

## Licencia

Este repositorio se distribuye bajo la **[GNU General Public License v3.0](LICENSE)**. Puedes usar, estudiar, modificar y redistribuir el material siempre que las obras derivadas mantengan la misma licencia.
