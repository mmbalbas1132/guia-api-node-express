---
title: "Glosario"
description: "Definiciones breves de los términos clave de Node.js, Express, bases de datos, seguridad, arquitectura y despliegue usados en la guía, con enlace a la página donde se explican."
section: referencias
order: 3
level: basico
tags: [glosario, terminos, definiciones, vocabulario]
prerequisites: []
tested_on: "Documento de referencia (sin código ejecutable)"
---

# Glosario

Términos ordenados alfabéticamente. Cuando un concepto tiene su propia página en la guía, se enlaza al final de la definición.

## A

- **ACID**: propiedades de las transacciones en bases de datos relacionales: *Atomicity* (todo o nada), *Consistency* (los datos siguen siendo válidos), *Isolation* (las transacciones concurrentes no se interfieren) y *Durability* (lo confirmado no se pierde). → [SQL frente a NoSQL](../04-bases-de-datos/01-conceptos-sql-vs-nosql.md)
- **API REST**: interfaz que expone recursos mediante URLs y verbos HTTP (`GET`, `POST`, `PUT`, `DELETE`), sin estado entre peticiones y normalmente con JSON. → [API REST y CRUD](../02-express/06-api-rest-crud.md)
- **async/await**: sintaxis que permite escribir código asíncrono con aspecto secuencial; `await` espera una promesa dentro de una función `async`. → [Callbacks, promesas y async/await](../01-fundamentos/07-callbacks-promesas-async-await.md)
- **Autenticación**: comprobar **quién** es el usuario (login). Se distingue de la **autorización**: qué puede hacer. → [JWT](../03-seguridad/02-jwt.md)
- **Autorización**: decidir si un usuario ya identificado puede realizar una acción (por rol, por propiedad del recurso…). → [Autorización y roles](../03-seguridad/03-autorizacion-roles.md)

## B

- **BASE**: alternativa a ACID en muchos sistemas NoSQL: *Basically Available, Soft state, Eventually consistent* (consistencia final). → [SQL frente a NoSQL](../04-bases-de-datos/01-conceptos-sql-vs-nosql.md)
- **bcrypt**: algoritmo de *hash* para contraseñas, deliberadamente lento y con *salt* incorporado. → [Contraseñas con bcrypt](../03-seguridad/01-contrasenas-bcrypt.md)
- **Bearer (token)**: esquema de autenticación HTTP en el que el cliente envía `Authorization: Bearer <token>`. → [JWT](../03-seguridad/02-jwt.md)
- **Buffer**: zona de memoria con bytes crudos, usada para datos binarios. → [Streams y Buffers](../01-fundamentos/08-streams-y-buffers.md)

## C

- **Caché**: almacén rápido de resultados ya calculados para no repetir operaciones costosas. → [Rendimiento y caché](../09-calidad-y-mantenimiento/04-rendimiento-y-cache.md)
- **Callback**: función que se pasa a otra para ejecutarla cuando termine una operación asíncrona. → [Callbacks, promesas y async/await](../01-fundamentos/07-callbacks-promesas-async-await.md)
- **CI/CD**: integración continua (probar y validar cada cambio automáticamente) y entrega/despliegue continuos. → [Mantenimiento](../09-calidad-y-mantenimiento/05-mantenimiento-y-buenas-practicas.md)
- **cluster**: módulo de Node.js que lanza varios procesos de la misma aplicación compartiendo puerto para aprovechar todos los núcleos. → [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)
- **CommonJS (CJS)**: sistema de módulos histórico de Node.js (`require` / `module.exports`). → [Módulos](../01-fundamentos/04-modulos-commonjs-esm.md)
- **Contenedor**: proceso aislado que ejecuta una imagen con la aplicación y su entorno. → [Docker](../06-despliegue-y-escalabilidad/03-docker.md)
- **CORS**: mecanismo de los navegadores que controla si una web de un origen puede llamar a la API de otro; el servidor lo autoriza con cabeceras. → [Helmet, CORS y límites](../03-seguridad/04-helmet-cors-y-limites.md)
- **CRUD**: las cuatro operaciones básicas sobre datos: *Create, Read, Update, Delete*. → [API REST y CRUD](../02-express/06-api-rest-crud.md)
- **CSRF**: ataque que hace que el navegador de un usuario autenticado envíe una petición no deseada. → [Sanitización y validación](../03-seguridad/05-sanitizacion-y-validacion-entrada.md)

## D

- **Dependencia**: paquete de terceros que necesita tu proyecto (`dependencies`); las de desarrollo van en `devDependencies`. → [npm y package.json](../01-fundamentos/03-npm-y-package-json.md)
- **Docker Compose**: herramienta que define y arranca varios contenedores a la vez desde un `docker-compose.yml`. → [Docker](../06-despliegue-y-escalabilidad/03-docker.md)

## E

- **Endpoint**: combinación de método HTTP y ruta que ofrece una operación de la API (por ejemplo, `GET /tareas`). → [Routing](../02-express/02-routing.md)
- **Event loop**: mecanismo que permite a Node.js atender muchas operaciones con un solo hilo, retomando los resultados cuando están listos. → [Event loop](../01-fundamentos/06-event-loop-y-asincronia.md)
- **EventEmitter**: clase que permite emitir y escuchar eventos con nombre. → [Event loop y asincronía](../01-fundamentos/06-event-loop-y-asincronia.md)
- **ESM (módulos ECMAScript)**: sistema de módulos estándar de JavaScript (`import` / `export`). → [Módulos](../01-fundamentos/04-modulos-commonjs-esm.md)
- **Express**: framework web minimalista para Node.js. → [Introducción a Express](../02-express/01-introduccion-e-instalacion.md)

## F

- **fetch**: API para hacer peticiones HTTP, disponible de forma global en Node.js. → [fetch](../01-fundamentos/11-fetch-cliente-http.md)

## G

- **Graceful shutdown (apagado ordenado)**: dejar de aceptar peticiones nuevas, terminar las activas y liberar recursos antes de cerrar. → [Preparar para producción](../06-despliegue-y-escalabilidad/01-preparar-para-produccion.md)

## H

- **Hash**: resultado de una función unidireccional que transforma un dato en una cadena fija; sirve para guardar contraseñas sin almacenarlas en claro. → [Contraseñas con bcrypt](../03-seguridad/01-contrasenas-bcrypt.md)
- **Helmet**: middleware que establece cabeceras HTTP de seguridad. → [Helmet, CORS y límites](../03-seguridad/04-helmet-cors-y-limites.md)
- **Health check (`/salud`)**: endpoint que indica si el servicio está vivo, usado por balanceadores y orquestadores. → [Preparar para producción](../06-despliegue-y-escalabilidad/01-preparar-para-produccion.md)

## I

- **IDOR**: fallo por el que un usuario accede a recursos ajenos con solo cambiar un identificador; se evita comprobando la propiedad en cada consulta. → [Autorización y roles](../03-seguridad/03-autorizacion-roles.md)
- **Imagen (Docker)**: plantilla inmutable con la aplicación y su entorno, a partir de la cual se crean contenedores. → [Docker](../06-despliegue-y-escalabilidad/03-docker.md)
- **Índice (base de datos)**: estructura auxiliar que acelera las búsquedas por un campo. → [Rendimiento y caché](../09-calidad-y-mantenimiento/04-rendimiento-y-cache.md)
- **Inyección (SQL / NoSQL)**: ataque que introduce instrucciones maliciosas en una consulta a través de la entrada del usuario. → [Sanitización y validación](../03-seguridad/05-sanitizacion-y-validacion-entrada.md)

## J

- **JWT (JSON Web Token)**: token firmado que contiene datos (*claims*) del usuario y una fecha de expiración; permite autenticar sin estado en el servidor. → [JWT](../03-seguridad/02-jwt.md)

## L

- **lean()**: opción de Mongoose que devuelve objetos JavaScript simples en lugar de documentos de Mongoose. → [Rendimiento y caché](../09-calidad-y-mantenimiento/04-rendimiento-y-cache.md)
- **Load balancer (balanceador de carga)**: reparte las peticiones entre varias instancias. → [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)
- **LTS**: versión de Node.js con soporte prolongado, recomendada para producción. → [Instalación y entorno](../01-fundamentos/02-instalacion-y-entorno.md)

## M

- **Middleware**: función que se ejecuta durante el ciclo petición-respuesta y puede modificarlas, terminarlas o pasar el control con `next()`. → [Middleware](../02-express/03-middleware.md)
- **Migración (base de datos)**: script versionado que cambia el esquema de forma reproducible. → [PostgreSQL y Sequelize](../04-bases-de-datos/04-postgresql-sequelize.md)
- **Monolito**: aplicación desplegada como una sola unidad. → [Monolito frente a microservicios](../05-arquitectura/01-monolito-vs-microservicios.md)
- **Mongoose**: biblioteca (ODM) para modelar y consultar MongoDB desde Node.js. → [MongoDB y Mongoose](../04-bases-de-datos/03-mongodb-mongoose.md)
- **Microservicios**: arquitectura de servicios pequeños e independientes que se comunican entre sí. → [Monolito frente a microservicios](../05-arquitectura/01-monolito-vs-microservicios.md)
- **MVC**: patrón que separa Modelo (datos), Vista (presentación) y Controlador (lógica de entrada). → [MVC y capas](../05-arquitectura/03-patron-mvc-y-capas.md)

## N

- **NGINX**: servidor web y proxy inverso muy usado como balanceador y para terminar TLS. → [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)
- **Node.js**: entorno de ejecución de JavaScript fuera del navegador, basado en el motor V8. → [Qué es Node.js](../01-fundamentos/01-que-es-nodejs.md)
- **npm**: gestor de paquetes de Node.js y registro público de paquetes. → [npm y package.json](../01-fundamentos/03-npm-y-package-json.md)
- **NoSQL**: bases de datos no relacionales (documentos, clave-valor, columnas, grafos). → [SQL frente a NoSQL](../04-bases-de-datos/01-conceptos-sql-vs-nosql.md)

## O

- **OpenAPI**: estándar para describir APIs REST en JSON/YAML; base de Swagger UI. → [Swagger](../09-calidad-y-mantenimiento/01-documentacion-con-swagger.md)
- **ORM / ODM**: biblioteca que mapea tablas (ORM, p. ej. Sequelize) o documentos (ODM, p. ej. Mongoose) a objetos del lenguaje. → [Modelado de datos](../04-bases-de-datos/02-modelado-de-datos.md)

## P

- **PM2**: gestor de procesos para Node.js (reinicios, logs, modo cluster). → [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)
- **Promesa (Promise)**: objeto que representa el resultado futuro de una operación asíncrona. → [Callbacks, promesas y async/await](../01-fundamentos/07-callbacks-promesas-async-await.md)
- **Proxy inverso**: servidor que recibe las peticiones de los clientes y las reenvía a la aplicación. → [Plataformas de despliegue](../06-despliegue-y-escalabilidad/02-plataformas-de-despliegue.md)

## R

- **Rate limiting (límite de tasa)**: restringir cuántas peticiones puede hacer un cliente en un periodo. → [Helmet, CORS y límites](../03-seguridad/04-helmet-cors-y-limites.md)
- **Redis**: base de datos en memoria clave-valor usada como caché y almacén compartido. → [Rendimiento y caché](../09-calidad-y-mantenimiento/04-rendimiento-y-cache.md)
- **Repositorio (patrón)**: capa que encapsula el acceso a datos tras una interfaz. → [Patrón repositorio](../05-arquitectura/04-patron-repositorio.md)
- **Router**: objeto de Express que agrupa rutas y middlewares de un área de la API. → [Routing](../02-express/02-routing.md)
- **RBAC**: control de acceso basado en roles. → [Autorización y roles](../03-seguridad/03-autorizacion-roles.md)

## S

- **Salt**: valor aleatorio que se añade a la contraseña antes del *hash* para que dos contraseñas iguales den hashes distintos. → [Contraseñas con bcrypt](../03-seguridad/01-contrasenas-bcrypt.md)
- **Sanitización**: limpiar o transformar la entrada del usuario para hacerla segura. → [Sanitización y validación](../03-seguridad/05-sanitizacion-y-validacion-entrada.md)
- **Scale up / scale out**: escalado vertical (más recursos en la misma máquina) y horizontal (más máquinas o instancias). → [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)
- **Semver**: versionado semántico `MAYOR.MENOR.PARCHE`. → [npm y package.json](../01-fundamentos/03-npm-y-package-json.md)
- **Sequelize**: ORM para bases de datos SQL en Node.js. → [PostgreSQL y Sequelize](../04-bases-de-datos/04-postgresql-sequelize.md)
- **SOLID**: cinco principios de diseño orientado a objetos: responsabilidad única, abierto/cerrado, sustitución de Liskov, segregación de interfaces e inversión de dependencias. → [Principios SOLID](../05-arquitectura/02-principios-solid.md)
- **Socket.io**: biblioteca de comunicación bidireccional en tiempo real. → [WebSockets y Socket.io](../07-tiempo-real/01-websockets-y-socketio.md)
- **Stream**: flujo de datos procesado por fragmentos, sin cargarlo todo en memoria. → [Streams y Buffers](../01-fundamentos/08-streams-y-buffers.md)
- **Supertest**: biblioteca para probar APIs HTTP contra una aplicación Express. → [Pruebas automatizadas](../09-calidad-y-mantenimiento/03-pruebas-automatizadas.md)
- **Swagger UI**: interfaz web interactiva generada a partir de una especificación OpenAPI. → [Swagger](../09-calidad-y-mantenimiento/01-documentacion-con-swagger.md)

## T

- **Transacción**: grupo de operaciones que se confirman o se descartan como una unidad. → [SQL frente a NoSQL](../04-bases-de-datos/01-conceptos-sql-vs-nosql.md)
- **TTL (*time to live*)**: tiempo de vida de un dato en caché antes de expirar. → [Rendimiento y caché](../09-calidad-y-mantenimiento/04-rendimiento-y-cache.md)

## V

- **V8**: motor de JavaScript de Google que ejecuta el código en Node.js. → [Qué es Node.js](../01-fundamentos/01-que-es-nodejs.md)
- **Validación**: comprobar que los datos recibidos cumplen las reglas esperadas antes de usarlos. → [Validación con express-validator](../02-express/07-validacion-con-express-validator.md)
- **Volumen (Docker)**: almacenamiento persistente que sobrevive a la vida del contenedor. → [Docker](../06-despliegue-y-escalabilidad/03-docker.md)

## W

- **WebSocket**: protocolo de conexión persistente y bidireccional entre cliente y servidor. → [WebSockets y Socket.io](../07-tiempo-real/01-websockets-y-socketio.md)
- **Worker thread**: hilo adicional de Node.js para ejecutar trabajo intensivo de CPU sin bloquear el hilo principal. → [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)

## X

- **XSS (*cross-site scripting*)**: ataque que inyecta scripts en páginas que verán otros usuarios; se evita escapando la salida y validando la entrada. → [Sanitización y validación](../03-seguridad/05-sanitizacion-y-validacion-entrada.md)

## Puntos clave

- Este glosario enlaza con la página donde se explica cada concepto en detalle.
- Si un término no aparece aquí, consulta el [índice de la guía](../README.md).

**Siguiente:** [Código obsoleto y errores frecuentes](04-codigo-obsoleto-y-errores-frecuentes.md)
