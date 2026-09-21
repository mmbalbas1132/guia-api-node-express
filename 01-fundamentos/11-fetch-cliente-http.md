---
title: "Fetch: cliente HTTP integrado"
description: "Hacer peticiones HTTP desde Node.js con fetch, manejar errores y timeouts."
section: fundamentos
order: 11
level: basico
tags: [fetch, http, cliente, undici, abortsignal]
prerequisites: [10-configuracion-y-variables-de-entorno]
tested_on: "Node.js 22"
---

# Fetch: cliente HTTP integrado

Node.js incluye la API estándar `fetch` como global, la misma que usan los navegadores. Funciona gracias a **Undici**, un cliente HTTP integrado en Node.js. No necesitas instalar `axios` ni `node-fetch` para el caso habitual.

## GET

```js
const respuesta = await fetch('https://api.ejemplo.com/usuarios');

if (!respuesta.ok) {                       // ok es true si el estado está entre 200 y 299
  throw new Error(`HTTP ${respuesta.status}`);
}
const usuarios = await respuesta.json();   // también .text(), .blob(), .arrayBuffer()
```

## POST con JSON

```js
const respuesta = await fetch('https://api.ejemplo.com/usuarios', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: 'Ana' }),
});
const creado = await respuesta.json();
```

## Manejo de errores

`fetch` **no lanza una excepción por un estado HTTP de error** (404, 500…): solo rechaza la promesa cuando falla la red o se aborta la petición. Debes comprobar `respuesta.ok` tú mismo.

```js
try {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
} catch (err) {
  // Fallo de red: TypeError ("fetch failed") con el motivo en err.cause
  console.error('Petición fallida:', err.message);
}
```

## Timeout

Para no esperar indefinidamente, usa una señal de cancelación:

```js
try {
  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });   // 5 segundos
} catch (err) {
  if (err.name === 'TimeoutError') console.error('Tiempo de espera agotado');
}
```

## Peticiones en paralelo

```js
const [usuarios, productos] = await Promise.all([
  fetch(`${base}/usuarios`).then((r) => r.json()),
  fetch(`${base}/productos`).then((r) => r.json()),
]);
```

## Undici para casos avanzados

Si necesitas control fino (reutilizar conexiones con un `Pool`, streaming, más rendimiento) puedes usar directamente el paquete `undici`, que es el motor detrás de `fetch`. Recuerda consumir siempre el cuerpo de la respuesta para no dejar conexiones colgadas.

## Puntos clave

- `fetch` es global en las versiones LTS actuales y no requiere dependencias.
- Comprueba `respuesta.ok`; un 404 no lanza excepción.
- Añade siempre un timeout (`AbortSignal.timeout`) a las llamadas externas.

**Siguiente sección:** [Express](../02-express/01-introduccion-e-instalacion.md)
