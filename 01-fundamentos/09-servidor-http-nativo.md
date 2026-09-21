---
title: "Servidor HTTP nativo"
description: "Anatomía de una transacción HTTP con el módulo node:http: request, response, cabeceras, cuerpo y enrutado manual."
section: fundamentos
order: 9
level: intermedio
tags: [http, request, response, servidor, routing]
prerequisites: [08-streams-y-buffers]
tested_on: "Node.js 22"
---

# Servidor HTTP nativo

Antes de usar Express conviene entender qué ocurre por debajo. Express no reemplaza el módulo `node:http`: **lo envuelve**. Los objetos `req` y `res` de Express son los mismos que crea Node.js, con métodos añadidos.

## Crear el servidor

```js
const { createServer } = require('node:http');

const server = createServer((request, response) => {
  // Esta función se ejecuta UNA VEZ por cada petición recibida
  response.end('Hola');
});

server.listen(3000);
```

`createServer` devuelve un `EventEmitter`; el callback equivale a `server.on('request', …)`.

## El objeto `request`

Es un `http.IncomingMessage` y, además, un **stream legible**:

```js
const { method, url, headers } = request;
// method: 'GET', 'POST', …   url: '/tareas?id=3'   headers: cabeceras (nombres en minúsculas)
const agente = headers['user-agent'];
```

El cuerpo de la petición llega por trozos; para leerlo entero se acumulan los chunks:

```js
let body = [];
request
  .on('error', (err) => console.error(err))
  .on('data', (chunk) => body.push(chunk))
  .on('end', () => {
    body = Buffer.concat(body).toString();
    // aquí ya tienes el cuerpo completo como texto
  });
```

> **Importante:** añade siempre un listener `'error'` al `request`; sin él, un error puede terminar el proceso.

## El objeto `response`

Es un `http.ServerResponse` y un **stream escribible**:

```js
response.statusCode = 404;                                   // por defecto es 200
response.setHeader('Content-Type', 'application/json');     // cabeceras individuales

// o todo de una vez:
response.writeHead(200, { 'Content-Type': 'application/json' });

response.write('parte 1');    // se puede escribir en varias veces
response.end('parte final');  // finaliza la respuesta (obligatorio)
```

Orden correcto: primero código de estado y cabeceras, después el cuerpo. Una vez enviada la primera parte del cuerpo ya no se pueden modificar las cabeceras.

## Ejemplo completo con enrutado manual

```js
const { createServer } = require('node:http');

const server = createServer((request, response) => {
  request.on('error', () => {
    response.statusCode = 400;
    response.end();
  });
  response.on('error', (err) => console.error(err));

  const { method, url } = request;

  if (method === 'GET' && url === '/json') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ hola: 'mundo' }));
  } else if (method === 'POST' && url === '/eco') {
    request.pipe(response);                       // devuelve tal cual el cuerpo recibido
  } else {
    response.statusCode = 404;
    response.end();
  }
});

server.listen(3000, () => console.log('http://localhost:3000'));
```

Pruébalo con `curl`:

```bash
curl http://localhost:3000/json
curl -X POST -d "eco!" http://localhost:3000/eco
```

## Por qué usar un framework

Este enrutado manual con `if/else` no escala: tendrías que analizar manualmente la URL, los parámetros, el cuerpo JSON, las cabeceras de seguridad, los errores… Frameworks como **Express** resuelven todo eso con una API declarativa (`app.get('/ruta', handler)`), middleware reutilizable y una comunidad enorme. Es el tema de la siguiente sección.

## Puntos clave

- `request` es un stream legible; `response`, un stream escribible.
- Siempre `response.end()` y siempre un listener `'error'` en `request`.
- Express se construye sobre este mismo módulo.

**Siguiente:** [Configuración y variables de entorno](10-configuracion-y-variables-de-entorno.md)
