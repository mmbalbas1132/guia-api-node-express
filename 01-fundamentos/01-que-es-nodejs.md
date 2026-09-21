---
title: "¿Qué es Node.js?"
description: "Qué es Node.js, cómo funciona su modelo de ejecución y cuándo conviene usarlo."
section: fundamentos
order: 1
level: basico
tags: [nodejs, introduccion, v8, event-loop, npm]
prerequisites: []
tested_on: "Node.js 22 y 24 LTS"
---

# ¿Qué es Node.js?

Node.js es un **entorno de ejecución de JavaScript** de código abierto y multiplataforma. Usa el motor **V8** (el mismo que Chrome) para ejecutar JavaScript **fuera del navegador**, con lo que puedes usar el mismo lenguaje en el frontend y en el backend.

Node.js **no es un lenguaje** ni un framework: es la plataforma que ejecuta tus programas JavaScript y les da acceso al sistema operativo (ficheros, red, procesos…) a través de una biblioteca estándar.

## Qué puedes construir

- APIs REST y servicios web (con Express, la protagonista de esta guía).
- Aplicaciones en tiempo real: chats, notificaciones, paneles en vivo (con WebSockets).
- Microservicios y herramientas de línea de comandos.
- Scripts de automatización y herramientas de desarrollo (gran parte del ecosistema frontend corre sobre Node.js).

## El modelo de ejecución

Una aplicación Node.js se ejecuta en **un solo proceso** y su código JavaScript corre en **un único hilo**. Node.js no crea un hilo por cada petición, como hacen otros servidores tradicionales. En su lugar:

1. Las operaciones de entrada/salida (leer un fichero, consultar una base de datos, hacer una petición de red) son **asíncronas y no bloqueantes**: se delegan al sistema operativo.
2. Mientras esa operación está en curso, el hilo de JavaScript queda libre para atender otras tareas.
3. Cuando la operación termina, se ejecuta la función (*callback*) o se resuelve la promesa asociada.

El mecanismo que coordina todo esto se llama **event loop** (bucle de eventos); lo verás en detalle en [Event loop y asincronía](06-event-loop-y-asincronia.md).

```text
Petición 1 ──► inicia consulta a BD ─┐            ┌─► responde 1
Petición 2 ──► inicia lectura fichero ┼─ (esperan) ┼─► responde 2
Petición 3 ──► inicia llamada HTTP ───┘            └─► responde 3
           el hilo de JS sigue libre mientras tanto
```

El resultado práctico: un servidor Node.js puede mantener **miles de conexiones simultáneas** sin gestionar hilos manualmente, siempre que el trabajo sea principalmente de E/S.

> **Aviso:** el trabajo intensivo de CPU (procesar imágenes, cálculos pesados, cifrado masivo…) sí bloquea el hilo y ralentiza a todos los usuarios. Para esos casos se usan *worker threads* o procesos separados (ver [Escalado y clustering](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)).

## Node.js frente al navegador

| Aspecto | Navegador | Node.js |
|---|---|---|
| Objetos globales | `window`, `document` (DOM) | No hay DOM ni `window`; existe `process`, `globalThis` |
| Acceso a ficheros y red | Muy limitado (sandbox) | Total, con módulos como `fs` o `http` |
| Versión del entorno | La que tenga cada visitante | La eliges tú al instalar Node.js |
| Sistema de módulos | ES Modules (`import`) | CommonJS (`require`) **y** ES Modules (`import`) |

Como controlas la versión de Node.js, sabes exactamente qué características de ECMAScript puedes usar, y puedes activar funciones experimentales con opciones de línea de comandos.

## Versiones: LTS y Current

Node.js publica dos tipos de versiones:

- **LTS** (*Long Term Support*): estables, con soporte prolongado. **Es la que debes usar en producción.**
- **Current**: incluye las últimas novedades, con un ciclo de soporte corto.

En el momento de escribir esta guía (septiembre de 2026), la versión LTS que ofrece la página oficial es la **v24**. Consulta siempre [nodejs.org/en/download](https://nodejs.org/en/download) para ver la vigente.

## Un primer servidor HTTP

Sin ningún framework, Node.js ya puede atender peticiones web con el módulo `node:http`:

```js
// servidor.js
const { createServer } = require('node:http');

const hostname = '127.0.0.1';
const port = 3000;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hola Mundo');
});

server.listen(port, hostname, () => {
  console.log(`Servidor en http://${hostname}:${port}/`);
});
```

Ejecútalo con `node servidor.js` y abre `http://127.0.0.1:3000/` en el navegador. Los objetos `req` (`http.IncomingMessage`) y `res` (`http.ServerResponse`) son la base sobre la que Express construye su API.

## Ecosistema: npm

Junto a Node.js se instala **npm**, el gestor de paquetes y el registro público más grande de bibliotecas JavaScript. Con un comando (`npm install express`) incorporas código de terceros a tu proyecto. Se explica en [npm y package.json](03-npm-y-package-json.md).

## Puntos clave

- Node.js ejecuta JavaScript fuera del navegador usando V8.
- Un solo hilo de JavaScript + E/S asíncrona no bloqueante = mucha concurrencia con pocos recursos.
- Ideal para APIs, tiempo real y microservicios; para cálculo intensivo, delega en workers.
- En producción, usa siempre una versión **LTS**.

**Siguiente:** [Instalación y entorno de trabajo](02-instalacion-y-entorno.md)
