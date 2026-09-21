---
title: "Introducción a Express e instalación"
description: "Qué es Express, cómo instalarlo, tu primer servidor y la estructura básica de un proyecto."
section: express
order: 1
level: basico
tags: [express, instalacion, hello-world, listen]
prerequisites: [09-servidor-http-nativo]
tested_on: "Express 5.2 · Node.js 22"
---

# Introducción a Express e instalación

**Express** es un framework web minimalista para Node.js. Es, esencialmente, un sistema de **enrutado** y de **middleware** con muy poca funcionalidad propia: el resto lo aportas tú con middleware propio o de terceros. Sobre el módulo `http` de Node.js añade:

- Enrutado declarativo (`app.get('/ruta', …)`).
- Una cadena de middleware para procesar peticiones.
- Métodos cómodos para responder (`res.json`, `res.status`, `res.redirect`…).
- Servido de archivos estáticos, gestión de errores y soporte para motores de plantillas.

> **Versión:** esta guía usa **Express 5** (la versión actual, 5.2.x en septiembre de 2026), que requiere **Node.js 18 o superior**. Las diferencias con Express 4 están en [Novedades de Express 5](09-express-5-novedades-y-migracion.md).

## Instalación

```bash
mkdir mi-api
cd mi-api
npm init -y
npm install express
```

Para instalarlo sin guardarlo en `package.json`: `npm install express --no-save`.

## Hola mundo

```js
// app.js
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.listen(port, () => {
  console.log(`Aplicación escuchando en http://localhost:${port}`);
});
```

```bash
node app.js
```

Abre `http://localhost:3000/` en el navegador. La aplicación responde a las peticiones `GET /` con «¡Hola Mundo!»; para cualquier otra ruta responde automáticamente con `404 Not Found`.

Con ES Modules sería idéntico salvo la primera línea:

```js
import express from 'express';   // requiere "type": "module" en package.json
```

> **Nota:** los objetos `req` y `res` de Express son **exactamente los mismos** que crea Node.js (`http.IncomingMessage` y `http.ServerResponse`), con métodos añadidos. Puedes seguir usando `req.pipe()`, `req.on('data', …)` o `res.write()`.

## `app.listen` y los errores de arranque

En Express 5, si se produce un error al abrir el puerto (por ejemplo, `EADDRINUSE`, puerto ya ocupado), ese error se pasa al **callback** de `listen`. En Express 4 se lanzaba como excepción.

```js
const server = app.listen(3000, (error) => {
  if (error) throw error;
  console.log(`Escuchando en ${JSON.stringify(server.address())}`);
});
```

## Desarrollo con recarga automática

No necesitas `nodemon`: Node.js tiene su propia opción.

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "node --watch app.js"
  }
}
```

## Estructura recomendada de un proyecto

Para aplicaciones pequeñas basta un fichero. En cuanto crecen, separa responsabilidades:

```text
mi-api/
├── src/
│   ├── app.js            # crea y configura la app Express (sin listen)
│   ├── server.js         # arranca el servidor (listen, base de datos, apagado ordenado)
│   ├── config/           # configuración y conexión a la base de datos
│   ├── routes/           # definición de rutas
│   ├── controllers/      # lógica de cada endpoint
│   ├── middlewares/      # autenticación, validación, errores
│   └── models/           # modelos de base de datos
├── tests/
├── .env
├── .env.example
└── package.json
```

Separar `app.js` (la aplicación) de `server.js` (el arranque) permite que las pruebas importen la app sin abrir un puerto. Lo verás aplicado en el [proyecto completo](../08-proyecto-api-tareas/01-diseno-y-planificacion.md).

## TypeScript

Express está escrito en JavaScript y no incluye sus propios tipos. Para usarlo con TypeScript instala los tipos de la comunidad como dependencias de desarrollo:

```bash
npm install --save-dev typescript @types/express @types/node
```

```ts
import express, { type Express, type Request, type Response } from 'express';

const app: Express = express();
app.get('/', (req: Request, res: Response) => {
  res.send('Hola Mundo');
});
app.listen(3000);
```

Con Node.js 22.18 o superior (o 23.6+) puedes ejecutar directamente `node src/app.ts`: Node.js elimina los tipos pero **no los comprueba**, así que sigue usando `npx tsc` para verificar el tipado.

## Puntos clave

- Express = enrutado + middleware sobre `node:http`.
- Separa `app.js` de `server.js` desde el principio.
- Usa `node --watch` en desarrollo.

**Siguiente:** [Enrutado (routing)](02-routing.md)
