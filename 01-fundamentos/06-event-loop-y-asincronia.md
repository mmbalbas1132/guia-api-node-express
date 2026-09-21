---
title: "Event loop y asincronía"
description: "Cómo Node.js gestiona operaciones bloqueantes y no bloqueantes: el event loop, nextTick, setImmediate y EventEmitter."
section: fundamentos
order: 6
level: intermedio
tags: [event-loop, asincronia, bloqueante, nextTick, setImmediate, eventemitter]
prerequisites: [05-sistema-de-archivos]
tested_on: "Node.js 22"
---

# Event loop y asincronía

## Bloqueante frente a no bloqueante

Se dice que una operación es **bloqueante** cuando el código JavaScript del proceso tiene que esperar a que termine una operación que no es JavaScript (leer un fichero, una consulta de red…) antes de continuar. Las funciones de la biblioteca estándar con sufijo `Sync` son bloqueantes; sus versiones asíncronas no lo son.

```js
const fs = require('node:fs');

// Bloqueante: nada más se ejecuta hasta terminar de leer
const datos = fs.readFileSync('fichero.txt', 'utf8');
console.log(datos);
masTrabajo();            // se ejecuta DESPUÉS de leer

// No bloqueante: la lectura se delega al sistema y el hilo sigue
fs.readFile('fichero.txt', 'utf8', (err, datos) => {
  if (err) throw err;
  console.log(datos);
});
masTrabajo();            // se ejecuta ANTES de que llegue el resultado
```

En un servidor esto es decisivo: mientras una petición espera a la base de datos, el proceso puede atender otras. Por eso la regla de oro es **no bloquear el hilo principal**.

## El event loop

El event loop es el mecanismo que permite a Node.js hacer E/S no bloqueante aunque solo haya un hilo de JavaScript: delega las operaciones al sistema operativo y, cuando terminan, ejecuta sus *callbacks*. En cada vuelta recorre estas fases:

| Fase | Qué ejecuta |
|---|---|
| **timers** | Callbacks de `setTimeout` y `setInterval` cuyo tiempo mínimo ya se cumplió (el tiempo es un umbral mínimo, no exacto) |
| **pending callbacks** | Callbacks de E/S diferidos por el sistema |
| **idle, prepare** | Uso interno |
| **poll** | Recoge nuevos eventos de E/S y ejecuta sus callbacks; si no hay nada pendiente, espera |
| **check** | Callbacks de `setImmediate` |
| **close callbacks** | Callbacks de cierre (p. ej. `socket.on('close')`) |

Entre fase y fase se procesan además dos colas especiales: primero `process.nextTick` y después las microtareas de las promesas.

## `process.nextTick`, promesas, `setTimeout` y `setImmediate`

```js
console.log('1 síncrono');
setTimeout(() => console.log('5 setTimeout 0'), 0);
setImmediate(() => console.log('6 setImmediate'));
process.nextTick(() => console.log('3 nextTick'));
Promise.resolve().then(() => console.log('4 microtarea de promesa'));
console.log('2 síncrono');
```

Salida garantizada: `1`, `2`, `3` (nextTick), `4` (promesa). Después llegan `setTimeout(…, 0)` y `setImmediate`, pero **su orden relativo no es determinista** cuando se llaman desde el módulo principal (depende del rendimiento del proceso). Dentro de un callback de E/S, `setImmediate` siempre se ejecuta antes.

| API | Cuándo se ejecuta |
|---|---|
| `process.nextTick(fn)` | Al terminar la operación actual, antes de seguir con el event loop |
| `Promise.then` / `await` | Como microtarea, justo después de las `nextTick` |
| `setTimeout(fn, ms)` | En la fase *timers*, pasado el tiempo mínimo |
| `setImmediate(fn)` | En la fase *check*, tras la fase de E/S |

> **Aviso:** `process.nextTick` no forma parte del event loop; llamarlo de forma recursiva puede **dejar sin ejecutar la E/S** (*starvation*). Su uso legítimo es garantizar que una API con firma asíncrona nunca invoque su callback de forma síncrona.

## Concurrencia con un solo hilo

Imagina una petición que tarda 50 ms, de los cuales 45 ms son esperar a una base de datos. Con E/S asíncrona, esos 45 ms el proceso puede atender otras peticiones: el hilo solo se ocupa durante los ~5 ms de trabajo real. Por eso Node.js escala bien en aplicaciones limitadas por E/S y mal en las limitadas por CPU.

Para trabajo intensivo de CPU, usa el módulo `node:worker_threads` (idealmente con un *pool* de workers) o procesos separados, en lugar de bloquear el event loop.

## EventEmitter

Gran parte de la API de Node.js (servidores HTTP, streams, sockets…) se basa en **eventos**. La clase `EventEmitter` te permite crear los tuyos:

```js
const EventEmitter = require('node:events');

const emisor = new EventEmitter();

emisor.on('saludo', (nombre) => console.log(`Hola, ${nombre}`));   // suscribirse
emisor.once('unaVez', () => console.log('solo la primera vez'));   // una sola ejecución

emisor.emit('saludo', 'Ana');      // dispara el evento con argumentos
emisor.emit('unaVez');
emisor.emit('unaVez');             // no hace nada: el listener ya se consumió

emisor.off('saludo', manejador);   // dejar de escuchar (o removeListener)
emisor.removeAllListeners('saludo');
```

Un evento llamado `'error'` recibe un trato especial: si se emite sin listener, lanza una excepción y puede tumbar el proceso. Añade siempre `.on('error', …)` en emisores que puedan fallar (por ejemplo, `request` y `response` en un servidor HTTP).

## Puntos clave

- No bloquees el hilo principal: usa las variantes asíncronas.
- Orden: código síncrono → `nextTick` → promesas → timers/`setImmediate`.
- `EventEmitter` es la base de la programación orientada a eventos en Node.js.
- La CPU intensiva se delega a *worker threads*.

**Siguiente:** [Callbacks, promesas y async/await](07-callbacks-promesas-async-await.md)
