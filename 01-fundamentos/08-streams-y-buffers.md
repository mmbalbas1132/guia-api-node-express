---
title: "Streams y Buffers"
description: "Procesar datos por partes con streams (Readable, Writable, Transform) y trabajar con datos binarios mediante Buffer."
section: fundamentos
order: 8
level: intermedio
tags: [streams, buffer, pipeline, memoria, rendimiento]
prerequisites: [07-callbacks-promesas-async-await]
tested_on: "Node.js 22"
---

# Streams y Buffers

## Buffer: datos binarios

Un `Buffer` es una secuencia de bytes en memoria. Aparece al leer ficheros sin indicar codificación, al recibir datos de red o al trabajar con cifrado.

```js
const b = Buffer.from('Hola ñ', 'utf8');
console.log(b.length);              // 7 (la "ñ" ocupa 2 bytes en UTF-8)
console.log(b.toString('hex'));     // 486f6c6120c3b1
console.log(b.toString('base64'));  // SG9sYSDDsQ==
console.log(Buffer.alloc(3));       // <Buffer 00 00 00>

const unido = Buffer.concat([Buffer.from('ab'), Buffer.from('cd')]);
console.log(unido.toString());      // 'abcd'
```

## Streams: procesar por partes

`fs.readFile` carga el fichero completo en memoria antes de entregártelo. Con un **stream**, los datos llegan en trozos (*chunks*) y se procesan según llegan. Ventajas:

- **Eficiencia de memoria:** no necesitas cargar todo en RAM (imprescindible con ficheros de gigabytes).
- **Menor tiempo de respuesta:** puedes empezar a procesar o enviar sin esperar al final.
- **Escalabilidad:** el consumo de memoria no crece con el tamaño de los datos.

### Tipos de stream

| Tipo | Descripción | Ejemplos |
|---|---|---|
| **Readable** | Fuente de datos | `fs.createReadStream`, `request` HTTP (en el servidor) |
| **Writable** | Destino de datos | `fs.createWriteStream`, `response` HTTP |
| **Duplex** | Lectura y escritura | Sockets TCP |
| **Transform** | Duplex que modifica los datos que pasan | `zlib.createGzip()` |

Eventos habituales de un stream legible: `data` (llega un chunk), `end` (no hay más datos), `close` y `error`.

### Leer con `for await`

```js
const fs = require('node:fs');

async function contarBytes(ruta) {
  let total = 0;
  for await (const chunk of fs.createReadStream(ruta)) {
    total += chunk.length;
  }
  return total;
}
```

### Encadenar con `pipeline`

`stream/promises.pipeline` conecta streams, gestiona los errores y libera los recursos correctamente. Es preferible a `.pipe()` suelto:

```js
const fs = require('node:fs');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');

// Copiar y comprimir un fichero sin cargarlo entero en memoria
await pipeline(
  fs.createReadStream('grande.log'),
  zlib.createGzip(),
  fs.createWriteStream('grande.log.gz')
);
```

### Servir un fichero grande por HTTP

```js
const http = require('node:http');
const fs = require('node:fs');
const { pipeline } = require('node:stream');

http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  pipeline(fs.createReadStream('grande.log'), res, (err) => {
    if (err) console.error('Error enviando el fichero', err.message);
  });
}).listen(3000);
```

### Crear un stream de transformación propio

```js
const { Transform, Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const aMayusculas = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  },
});

let salida = '';
await pipeline(
  Readable.from(['hola ', 'mundo']),
  aMayusculas,
  async function (origen) {
    for await (const trozo of origen) salida += trozo;
  }
);
console.log(salida);   // 'HOLA MUNDO'
```

Para un `Readable` completamente propio puedes heredar de `Readable` e implementar `_read()`, llamando a `this.push(dato)` para emitir y `this.push(null)` para indicar el final. Un `Writable` propio implementa `_write(chunk, encoding, callback)`.

## Puntos clave

- Usa streams para datos grandes o de origen incierto; `readFile` para ficheros pequeños.
- `pipeline` conecta streams y gestiona errores y limpieza.
- Los objetos `request` y `response` de HTTP son streams.

**Siguiente:** [Servidor HTTP nativo](09-servidor-http-nativo.md)
