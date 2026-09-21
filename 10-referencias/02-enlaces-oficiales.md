---
title: "Enlaces y documentación oficial"
description: "Directorio de la documentación oficial de Node.js, Express, bases de datos, seguridad, despliegue y herramientas usadas en la guía, con qué encontrar en cada una."
section: referencias
order: 2
level: basico
tags: [enlaces, documentacion-oficial, referencias, recursos]
prerequisites: []
tested_on: "Enlaces comprobados (respuesta correcta y título de la página) el 21 de septiembre de 2026"
---

# Enlaces y documentación oficial

La documentación oficial es la fuente más fiable y la que primero se actualiza. Todos los enlaces de esta página se comprobaron al redactarla; se incluyen solo **raíces de documentación** (que cambian poco) y no páginas profundas, que sí suelen moverse.

## Node.js

| Recurso | Enlace | Para qué |
|---|---|---|
| Sitio y descargas | <https://nodejs.org/en/download> | Instaladores y versión LTS recomendada |
| Guías «Learn» | <https://nodejs.org/en/learn> | Tutoriales oficiales: introducción, asincronía, ficheros, TypeScript, pruebas, seguridad… |
| Referencia de la API | <https://nodejs.org/api/> | Documentación de todos los módulos integrados (`fs`, `http`, `path`, `events`, `stream`, `node:test`…) |
| Versiones y calendario | <https://nodejs.org/en/about/previous-releases> | Qué versión es *Current*, LTS o fin de soporte (*EOL*) |
| Introducción | <https://nodejs.org/en/learn/getting-started/introduction-to-nodejs> | Qué es Node.js y su modelo de ejecución |
| Buenas prácticas de seguridad | <https://nodejs.org/en/learn/getting-started/security-best-practices> | Amenazas y mitigaciones (base de [Seguridad en Node.js](../03-seguridad/06-buenas-practicas-seguridad-node.md)) |

> **Nota sobre versiones:** la referencia de la API en `nodejs.org/api/` muestra la versión más reciente (*Current*), que puede no ser la LTS. Al escribir esta guía la LTS era la 24; para ver la documentación exacta de la versión que ejecutas, usa el selector de versión de la propia página. Ver [Instalación y entorno](../01-fundamentos/02-instalacion-y-entorno.md).

## Express

| Recurso | Enlace | Para qué |
|---|---|---|
| Sitio oficial | <https://expressjs.com/> | Punto de entrada: guías y referencia de la API |
| Routing | <https://expressjs.com/en/guide/routing.html> | Rutas, parámetros, `Router` |
| Migrar a Express 5 | <https://expressjs.com/en/guide/migrating-5.html> | Cambios incompatibles respecto a Express 4 (ver [Express 5](../02-express/09-express-5-novedades-y-migracion.md)) |
| Seguridad en producción | <https://expressjs.com/en/advanced/best-practice-security.html> | Recomendaciones oficiales de seguridad |

La documentación de Express también incluye guías de manejo de errores, uso de middleware, rendimiento y despliegue en producción, accesibles desde el sitio oficial.

## Bases de datos

| Tecnología | Enlace |
|---|---|
| MongoDB | <https://www.mongodb.com/docs/> |
| Mongoose (ODM) | <https://mongoosejs.com/docs/> |
| PostgreSQL | <https://www.postgresql.org/docs/> |
| Sequelize v6 (ORM) | <https://sequelize.org/docs/v6/> |
| Redis | <https://redis.io/docs/> |

Consulta siempre la documentación de **la versión mayor que instalas** (por ejemplo, Mongoose 9 o Sequelize 6): las diferencias entre versiones son la fuente de muchos errores al copiar ejemplos antiguos.

## Tiempo real, documentación de API y registros

| Herramienta | Enlace |
|---|---|
| Socket.IO | <https://socket.io/docs/v4/> |
| Especificación OpenAPI / Swagger | <https://swagger.io/specification/> |
| Winston (GitHub) | <https://github.com/winstonjs/winston> |

## Despliegue e infraestructura

| Herramienta | Enlace |
|---|---|
| Docker | <https://docs.docker.com/> |
| NGINX | <https://nginx.org/en/docs/> |
| PM2 | <https://pm2.keymetrics.io/docs/usage/quick-start/> |
| Heroku, Vercel, DigitalOcean | Consulta la documentación vigente de cada plataforma: precios, planes y comandos cambian con frecuencia (ver [Plataformas de despliegue](../06-despliegue-y-escalabilidad/02-plataformas-de-despliegue.md)). La página de Vercel para Express es <https://vercel.com/docs/frameworks/backend/express>. |

## Seguridad y buenas prácticas

| Recurso | Enlace | Para qué |
|---|---|---|
| OWASP Top 10 | <https://owasp.org/www-project-top-ten/> | Las categorías de riesgo más críticas en aplicaciones web |
| Twelve-Factor App | <https://12factor.net/es/config> | Metodología para aplicaciones desplegables; este enlace trata la **configuración por entorno** ([Variables de entorno](../01-fundamentos/10-configuracion-y-variables-de-entorno.md)) |

## Paquetes npm

Cada paquete usado tiene su ficha en `https://www.npmjs.com/package/<nombre>` con documentación, versiones y enlaces al repositorio (por ejemplo, `express`, `mongoose`, `helmet`, `bcrypt`, `jsonwebtoken`, `express-validator`, `winston`, `supertest`). Antes de adoptar uno, mira la fecha de la última versión, las descargas semanales y las incidencias abiertas.

## Cómo consultar la documentación con provecho

1. **Empieza por la guía introductoria** y usa la referencia de la API para los detalles.
2. **Comprueba la versión** de la página frente a la que tienes instalada (`npm ls <paquete>`).
3. Para un error concreto, busca el **mensaje literal** junto al nombre del paquete y la versión.
4. Ante un ejemplo antiguo, contrasta con la sección de novedades o migración de la documentación oficial. Ver [Código obsoleto y errores frecuentes](04-codigo-obsoleto-y-errores-frecuentes.md).

## Puntos clave

- Prioriza la documentación oficial y respeta la versión de cada herramienta.
- `nodejs.org/en/about/previous-releases` indica qué versión de Node.js usar hoy.
- Los servicios cloud cambian: verifica planes y comandos en su documentación vigente.

**Siguiente:** [Glosario](03-glosario.md)
