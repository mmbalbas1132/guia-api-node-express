---
title: "Buenas prácticas de seguridad en Node.js"
description: "Resumen de las recomendaciones oficiales de seguridad de Node.js y Express para producción: DoS, cadena de suministro, TLS, cookies y más."
section: seguridad
order: 6
level: avanzado
tags: [seguridad, dos, supply-chain, tls, cookies, prototype-pollution, permisos]
prerequisites: [05-sanitizacion-y-validacion-entrada]
tested_on: "Node.js 24 LTS · Express 5.2"
---

# Buenas prácticas de seguridad en Node.js

Este resumen recoge las recomendaciones de las guías oficiales de [Node.js](https://nodejs.org/en/learn/getting-started/security-best-practices) y de [Express](https://expressjs.com/en/advanced/best-practice-security.html), organizadas en una lista de comprobación.

## Aplicación Express

- **No uses versiones sin mantenimiento** de Express ni de Node.js: usa una LTS activa y Express 5.
- **TLS (HTTPS)** siempre que se transmitan datos sensibles. Lo más habitual es terminar TLS en un proxy inverso (NGINX) con certificados gratuitos de Let's Encrypt.
- **`helmet`**, **CORS** restringido y **límite de peticiones**: ver [Helmet, CORS y límites](04-helmet-cors-y-limites.md).
- **Valida toda la entrada** y evita redirecciones abiertas: ver [Sanitización y validación](05-sanitizacion-y-validacion-entrada.md).
- **Manejador de errores propio** que no revele el *stack trace* ni detalles internos.

### Cookies y sesiones

Si usas sesiones con cookies:

- No uses el nombre de cookie por defecto (`connect.sid`); un nombre genérico (`sessionId`) dificulta el *fingerprinting*.
- Opciones de cookie: `secure` (solo HTTPS), `httpOnly` (invisible para JavaScript), `domain`, `path`, `expires`/`maxAge`, y `sameSite`.
- `express-session` guarda los datos en el servidor (solo el ID viaja en la cookie), pero su almacén por defecto en memoria **no es apto para producción**: usa un almacén escalable (Redis, base de datos). `cookie-session` guarda toda la sesión dentro de la cookie (máx. ~4 KB, visible para el cliente).
- Detrás de un proxy, `app.set('trust proxy', 1)`.

### Fuerza bruta

Bloquea intentos de login por (usuario + IP) consecutivos y por IP en periodos largos. Ver el límite de peticiones en la página anterior.

## Denegación de servicio (DoS) del servidor HTTP

- Gestiona los errores de socket y de petición para que un cliente malformado no tumbe el proceso.
- **Ataque Slowloris**: un cliente abre muchas conexiones y envía los datos extremadamente despacio para mantenerlas ocupadas. Mitigaciones:
  - Poner un **proxy inverso** delante.
  - Configurar **timeouts** en `http.Server` (`headersTimeout`, `requestTimeout`, `timeout`, `keepAliveTimeout`).
  - Limitar sockets (`agent.maxSockets`, `maxTotalSockets`, `maxFreeSockets`, `server.maxRequestsPerSocket`).
- Limita el tamaño de los cuerpos (`express.json({ limit })`).

```js
const server = app.listen(3000);
server.requestTimeout = 30_000;        // tiempo máximo para recibir la petición completa
server.headersTimeout = 20_000;        // tiempo máximo para recibir las cabeceras
server.keepAliveTimeout = 5_000;       // inactividad tolerada en conexiones persistentes
```

## Cadena de suministro y dependencias

Cada paquete de npm es código que ejecutas con los permisos de tu aplicación. Riesgos: paquetes maliciosos, *typosquatting*, *dependency confusion*, cuentas de mantenedores comprometidas, lockfiles manipulados.

- Usa y revisa el **lockfile**; instala con **`npm ci`** en CI y producción.
- **Fija versiones** cuando sea posible y revisa los cambios de `package.json`.
- Ejecuta **`npm audit`** en tu integración continua (y herramientas como Snyk o Socket si necesitas más).
- Considera **`--ignore-scripts`** (`npm config set ignore-scripts true`) para no ejecutar scripts de instalación de terceros.
- npm 11.10 y posteriores admiten `--min-release-age` para aplicar un periodo de «enfriamiento» (en días) a las versiones recién publicadas.
- Al **publicar** un paquete, revisa qué se incluye con `npm publish --dry-run` y limita con `.npmignore` o el campo `files` de `package.json` para no exponer secretos.

## Criptografía y comparaciones

- Para contraseñas: bcrypt, scrypt (`crypto.scrypt`) o Argon2. Nunca hashes rápidos.
- Para comparar secretos (tokens, firmas HMAC) usa **`crypto.timingSafeEqual`**: una comparación normal (`===`) puede filtrar información por el tiempo que tarda (*timing attack*).

## Prototype pollution

Un atacante manipula `Object.prototype` a través de propiedades como `__proto__` en objetos que se fusionan de forma recursiva (`merge`, `extend`), alterando el comportamiento de toda la aplicación. Mitigaciones:

- Valida las entradas con un **JSON Schema**.
- Evita funciones de fusión recursiva sobre datos no fiables.
- Crea objetos sin prototipo (`Object.create(null)`) para diccionarios.
- Comprueba propiedades con `Object.hasOwn(obj, clave)`.
- Ejecuta Node.js con `--disable-proto=delete` si tu código no usa `__proto__`.

## Resolución de módulos

Node.js resuelve `require('./auth')` buscando primero un fichero `auth.js` y también una carpeta `auth/`; una ambigüedad puede cargar código inesperado. Usa nombres y extensiones explícitos en rutas relativas.

## Modelo de permisos de Node.js

Node.js incluye un **modelo de permisos** que restringe lo que un proceso puede hacer (sistema de ficheros, red, procesos hijo, addons nativos) mediante la opción `--permission`. Es una capa adicional útil para limitar el daño si una dependencia es comprometida (consulta la documentación oficial de permisos para la sintaxis exacta de cada versión).

## Otras recomendaciones

- **No ejecutes el inspector** (`--inspect`) en producción: expone la depuración a ataques de *DNS rebinding*.
- **HTTP request smuggling**: no actives `insecureHTTPParser`; normaliza en el proxy y usa HTTP/2 extremo a extremo si es posible.
- **Ejecuta con el mínimo privilegio**: usuario sin privilegios (en Docker, `USER node`), sin `root`.
- **No uses características experimentales en producción.**
- **Variables de entorno** para secretos, nunca en el repositorio.
- Herramientas de evaluación: OpenSSF Scorecard y el Best Practices Badge para tus proyectos y dependencias.

## Lista de comprobación rápida

- [ ] Node.js LTS y Express 5 actualizados
- [ ] HTTPS con certificado válido
- [ ] `helmet`, CORS restringido y rate limiting
- [ ] Validación de todas las entradas; `sanitizeFilter` si usas Mongoose
- [ ] Contraseñas con bcrypt; JWT con secreto fuerte y caducidad
- [ ] Manejador de errores que no filtra información
- [ ] `npm ci` + `npm audit` en CI
- [ ] Timeouts configurados; límite de tamaño del cuerpo
- [ ] Contenedor/proceso sin privilegios de root
- [ ] Sin secretos en Git

**Siguiente sección:** [Bases de datos](../04-bases-de-datos/01-conceptos-sql-vs-nosql.md)
