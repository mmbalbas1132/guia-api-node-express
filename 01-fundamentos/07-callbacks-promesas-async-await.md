---
title: "Callbacks, promesas y async/await"
description: "Los tres estilos de programación asíncrona en Node.js, cómo manejar errores en cada uno y cuándo usar Promise.all, allSettled, race y any."
section: fundamentos
order: 7
level: intermedio
tags: [asincronia, callbacks, promesas, async-await, errores]
prerequisites: [06-event-loop-y-asincronia]
tested_on: "Node.js 22"
---

# Callbacks, promesas y async/await

La programación asíncrona en JavaScript ha evolucionado en tres etapas. Hoy se recomienda **`async/await`**, pero conviene conocer las anteriores porque siguen apareciendo en código existente y en APIs antiguas.

## 1. Callbacks

Un *callback* es una función que se pasa como argumento para ejecutarse cuando termine una operación. En Node.js se sigue la convención **error-first**: el primer parámetro es el error (o `null` si todo fue bien).

```js
const fs = require('node:fs');

fs.readFile('datos.txt', 'utf8', (err, datos) => {
  if (err) {
    console.error('Error al leer:', err.message);
    return;                       // importante: no seguir si hubo error
  }
  console.log(datos);
});
```

### El problema: *callback hell*

Cuando una operación depende de la anterior, los callbacks se anidan y el código se vuelve difícil de leer y de manejar errores:

```js
fs.readFile('a.txt', 'utf8', (err, a) => {
  if (err) return console.error(err);
  fs.readFile('b.txt', 'utf8', (err, b) => {
    if (err) return console.error(err);
    fs.writeFile('c.txt', a + b, (err) => {
      if (err) return console.error(err);
      console.log('Listo');
    });
  });
});
```

## 2. Promesas

Una **promesa** representa un valor que estará disponible en el futuro. Tiene tres estados: *pending* (pendiente), *fulfilled* (cumplida) y *rejected* (rechazada). Cuando deja de estar pendiente se dice que está *settled* (resuelta).

```js
const esperar = (ms) =>
  new Promise((resolve, reject) => {
    if (ms < 0) return reject(new Error('Tiempo negativo'));
    setTimeout(() => resolve(`Esperé ${ms} ms`), ms);
  });

esperar(500)
  .then((mensaje) => {
    console.log(mensaje);
    return esperar(300);           // encadenar: el siguiente .then espera a esta promesa
  })
  .then((mensaje) => console.log(mensaje))
  .catch((err) => console.error('Falló:', err.message))   // captura cualquier rechazo de la cadena
  .finally(() => console.log('Siempre se ejecuta'));
```

Si el *executor* (la función que pasas a `new Promise`) lanza una excepción, la promesa se rechaza.

### Convertir callbacks en promesas

La mayoría de módulos de Node.js ya ofrecen versión con promesas (`fs/promises`, `timers/promises`, `stream/promises`, `dns/promises`…). Si una API solo admite callbacks con el patrón error-first, conviértela con `util.promisify`:

```js
const { promisify } = require('node:util');
const fs = require('node:fs');

const leerFichero = promisify(fs.readFile);
const texto = await leerFichero('datos.txt', 'utf8');
```

## 3. `async` / `await`

`async` marca una función que **siempre devuelve una promesa**; `await` pausa esa función hasta que la promesa se asienta (sin bloquear el proceso) y devuelve su valor. El código se lee de forma secuencial:

```js
const fs = require('node:fs/promises');

async function unirFicheros() {
  try {
    const a = await fs.readFile('a.txt', 'utf8');
    const b = await fs.readFile('b.txt', 'utf8');
    await fs.writeFile('c.txt', a + b);
    console.log('Listo');
  } catch (err) {
    console.error('Error:', err.message);      // un único catch para todo
  }
}

unirFicheros();
```

`await` solo puede usarse dentro de una función `async`, **o en el nivel superior de un módulo ES** (*top-level await*):

```js
// app.mjs (ESM)
import { setTimeout as esperar } from 'node:timers/promises';
await esperar(1000);
console.log('Pasó un segundo');
```

## Ejecutar en paralelo: combinadores

Con `await` seguidos, las operaciones se ejecutan **una tras otra**. Si son independientes, lánzalas a la vez:

```js
// Secuencial: tarda la SUMA de los tiempos
const usuario = await obtenerUsuario();
const pedidos = await obtenerPedidos();

// Paralelo: tarda lo que tarde la MÁS lenta
const [usuario2, pedidos2] = await Promise.all([obtenerUsuario(), obtenerPedidos()]);
```

| Combinador | Se resuelve cuando… | Si alguna falla |
|---|---|---|
| `Promise.all([...])` | Todas se cumplen | Se rechaza en cuanto una falla (las demás siguen ejecutándose) |
| `Promise.allSettled([...])` | Todas terminan (bien o mal) | Nunca se rechaza; devuelve `{status, value \| reason}` por cada una |
| `Promise.race([...])` | La primera se asienta (éxito o fallo) | Adopta el resultado de la primera |
| `Promise.any([...])` | La primera se **cumple** | Se rechaza solo si todas fallan |

```js
const resultados = await Promise.allSettled([tareaA(), tareaB()]);
for (const r of resultados) {
  console.log(r.status === 'fulfilled' ? r.value : r.reason.message);
}
```

> **Consejo:** con miles de promesas simultáneas en `Promise.all` puedes agotar memoria o conexiones. Procesa por lotes en esos casos.

## Manejo de errores: comparativa

| Estilo | Cómo se captura un error |
|---|---|
| Callback | `if (err) …` como primer paso del callback |
| Promesa | `.catch(err => …)` al final de la cadena |
| async/await | `try { … } catch (err) { … }` |

Un error dentro de un callback asíncrono **no puede capturarse** con un `try/catch` externo, porque cuando ocurre la pila de llamadas original ya terminó. Otra razón para preferir promesas y `async/await`.

Una **promesa rechazada sin manejar** (sin `.catch` ni `try/catch`) termina el proceso en las versiones actuales de Node.js. Maneja siempre los errores de tus operaciones asíncronas.

## Puntos clave

- Usa `async/await` con las APIs de promesas (`fs/promises`, etc.).
- Lanza en paralelo lo independiente con `Promise.all` / `allSettled`.
- Maneja los errores en cada operación asíncrona; nunca dejes promesas sin `catch`.

**Siguiente:** [Streams y Buffers](08-streams-y-buffers.md)
