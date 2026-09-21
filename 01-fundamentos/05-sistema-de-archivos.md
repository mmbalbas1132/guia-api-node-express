---
title: "El sistema de archivos (fs y path)"
description: "Leer, escribir y gestionar ficheros y carpetas con los módulos fs y path, en sus tres variantes."
section: fundamentos
order: 5
level: basico
tags: [fs, path, ficheros, carpetas, streams]
prerequisites: [04-modulos-commonjs-esm]
tested_on: "Node.js 22"
---

# El sistema de archivos (`fs` y `path`)

El módulo `fs` permite trabajar con ficheros y carpetas. Casi todas sus funciones existen en **tres variantes**:

| Variante | Ejemplo | Cuándo usarla |
|---|---|---|
| Callback | `fs.readFile(ruta, 'utf8', (err, datos) => …)` | Código antiguo |
| **Promesas** | `await fsp.readFile(ruta, 'utf8')` con `require('node:fs/promises')` | **Recomendada** en código nuevo |
| Síncrona (`…Sync`) | `fs.readFileSync(ruta, 'utf8')` | Solo al arrancar la aplicación o en scripts sencillos |

> **Aviso:** las funciones `…Sync` **bloquean** el hilo de JavaScript hasta terminar. En un servidor, bloquearían a todos los usuarios; úsalas únicamente durante el arranque.

## Leer ficheros

```js
const fs = require('node:fs');
const fsp = require('node:fs/promises');

// Con promesas (recomendado)
async function leer() {
  try {
    const texto = await fsp.readFile('notas.txt', 'utf8');
    console.log(texto);
  } catch (err) {
    console.error('No se pudo leer:', err.message);
  }
}

// Con callback
fs.readFile('notas.txt', 'utf8', (err, datos) => {
  if (err) return console.error(err);
  console.log(datos);
});

// Síncrona
const contenido = fs.readFileSync('notas.txt', 'utf8');
```

Si no indicas la codificación (`'utf8'`), obtienes un `Buffer` con los bytes en bruto.

> **Nota:** `readFile` y `readFileSync` cargan **todo el fichero en memoria**. Para ficheros grandes usa *streams* (ver [Streams y Buffers](08-streams-y-buffers.md)).

## Escribir ficheros

```js
const fsp = require('node:fs/promises');

await fsp.writeFile('salida.txt', 'Primera línea\n');       // crea o REEMPLAZA el contenido
await fsp.appendFile('salida.txt', 'Segunda línea\n');      // añade al final
```

`writeFile` **reemplaza** el contenido por defecto. Puedes cambiar ese comportamiento con la opción `flag`:

| Flag | Comportamiento |
|---|---|
| `w` (por defecto) | Escribe; crea el fichero o lo vacía |
| `a` | Añade al final; crea el fichero si no existe |
| `r+` | Lee y escribe; el fichero debe existir |
| `w+` | Lee y escribe; crea el fichero o lo vacía |
| `a+` | Lee y añade al final; crea el fichero si no existe |

```js
await fsp.writeFile('registro.log', 'evento\n', { flag: 'a' });
```

## Rutas con `path`

Nunca construyas rutas concatenando cadenas: cada sistema operativo usa separadores distintos. Usa `path`:

```js
const path = require('node:path');

const ruta = path.join(__dirname, 'datos', 'notas.txt');   // une segmentos y normaliza
path.basename(ruta);            // 'notas.txt'
path.extname(ruta);             // '.txt'
path.dirname(ruta);             // carpeta que contiene el fichero
path.resolve('datos', 'a.txt'); // ruta absoluta a partir de la carpeta de trabajo
path.normalize('/a/b/../c');    // '/a/c'
path.join('/a', 'b', '../c', 'd.txt');   // '/a/c/d.txt'
```

Usa `__dirname` (CommonJS) o `import.meta.dirname` (ESM) para que las rutas no dependan del directorio desde el que lances `node`.

## Carpetas

```js
const fsp = require('node:fs/promises');
const fs = require('node:fs');

await fsp.mkdir('a/b/c', { recursive: true });    // crea también las intermedias
fs.existsSync('a/b');                             // true / false
const nombres = await fsp.readdir('a');           // lista el contenido
await fsp.rename('a/notas.txt', 'a/b/notas.txt'); // renombrar o mover
await fsp.rmdir('vacia');                         // solo carpetas vacías
await fsp.rm('a', { recursive: true, force: true }); // borra una carpeta con todo su contenido

try {
  await fsp.access('fichero.txt');                // comprueba existencia/permisos
} catch {
  console.log('No existe o no hay permisos');
}
```

Otras funciones habituales: `fsp.stat(ruta)` (tamaño, fechas, si es fichero o carpeta), `fsp.copyFile(origen, destino)` y `fsp.unlink(ruta)` (borrar un fichero).

## Peligro: mezclar operaciones asíncronas y síncronas

```js
// ❌ Puede borrar el fichero ANTES de que termine de leerse
fs.readFile('temp.txt', 'utf8', (err, datos) => { /* … */ });
fs.unlinkSync('temp.txt');

// ✅ Encadena las operaciones
const datos = await fsp.readFile('temp.txt', 'utf8');
await fsp.unlink('temp.txt');
```

## Puntos clave

- Prefiere `fs/promises` con `async/await`; reserva `…Sync` para el arranque.
- `writeFile` reemplaza; `appendFile` (o `flag: 'a'`) añade.
- Construye rutas con `path.join` / `path.resolve`.
- Para ficheros grandes, usa streams.

**Siguiente:** [Event loop y asincronía](06-event-loop-y-asincronia.md)
