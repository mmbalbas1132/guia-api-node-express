---
title: "Módulos: CommonJS y ES Modules"
description: "Cómo organizar el código en módulos con require/module.exports y con import/export."
section: fundamentos
order: 4
level: basico
tags: [modulos, commonjs, esm, require, import, export]
prerequisites: [03-npm-y-package-json]
tested_on: "Node.js 22"
---

# Módulos: CommonJS y ES Modules

Un **módulo** es un fichero con código reutilizable. Dividir un programa en módulos lo hace más legible, mantenible y fácil de probar. Node.js soporta dos sistemas de módulos.

## CommonJS (`require` / `module.exports`)

Es el sistema histórico de Node.js y el que usan la mayoría de tutoriales y proyectos existentes. **Toda esta guía usa CommonJS** en sus ejemplos, con las equivalencias ESM indicadas cuando importa.

```js
// matematicas.js
function sumar(a, b) {
  return a + b;
}
const PI = 3.14159;

module.exports = { sumar, PI };
```

```js
// app.js
const { sumar, PI } = require('./matematicas');   // ruta relativa: empieza por ./ o ../
const path = require('node:path');                // módulo integrado (prefijo node:)
const express = require('express');               // paquete instalado con npm

console.log(sumar(2, 3), PI);
```

Detalles importantes:

- `require` es **síncrono** y devuelve lo que el módulo asignó a `module.exports`.
- Cada módulo se **carga y ejecuta una sola vez**; las siguientes llamadas a `require` reciben el resultado en caché.
- Las variables de un módulo son **privadas** salvo que las exportes.
- Dentro de un módulo CommonJS tienes `__dirname` y `__filename` (ruta de la carpeta y del fichero actuales).
- `exports.nombre = ...` es un atajo para añadir propiedades a `module.exports`; pero si quieres exportar una función o clase directamente, asigna `module.exports = ...`.

## ES Modules (`import` / `export`)

Es el sistema estándar de JavaScript, el mismo que se usa en el navegador. Para usarlo en Node.js tienes tres opciones:

1. Poner `"type": "module"` en `package.json` (los `.js` pasan a ser ESM).
2. Usar la extensión `.mjs` en el fichero.
3. Mantener CommonJS en un proyecto ESM con la extensión `.cjs`.

```js
// matematicas.mjs
export function sumar(a, b) {
  return a + b;
}
export const PI = 3.14159;
export default function restar(a, b) {
  return a - b;
}
```

```js
// app.mjs
import restar, { sumar, PI } from './matematicas.mjs';   // en ESM la extensión es obligatoria
import { readFile } from 'node:fs/promises';
import express from 'express';

console.log(sumar(2, 3), restar(5, 1), PI);
```

Diferencias prácticas con CommonJS:

| | CommonJS | ES Modules |
|---|---|---|
| Sintaxis | `require()` / `module.exports` | `import` / `export` |
| Carga | Síncrona | Asíncrona (análisis estático) |
| Extensión en rutas relativas | Opcional | **Obligatoria** (`./fichero.js`) |
| `__dirname`, `__filename` | Disponibles | No existen; usa `import.meta.dirname` e `import.meta.filename` |
| `await` en el nivel superior | No | Sí (*top-level await*) |

```js
// ESM: equivalentes de __dirname y __filename (Node.js 20.11+)
console.log(import.meta.dirname, import.meta.filename);

// ESM: top-level await
const datos = await fetch('https://example.com/api').then((r) => r.json());
```

## Combinar ambos sistemas

- Desde ESM puedes importar un módulo CommonJS con `import`.
- Desde CommonJS puedes cargar un módulo ESM con `import()` dinámico (devuelve una promesa), y en versiones recientes de Node.js también con `require()`, **siempre que ese módulo no use `await` de nivel superior** (en ese caso `require()` falla con `ERR_REQUIRE_ASYNC_MODULE`).

```js
// Desde CommonJS
import('./matematicas.mjs').then((m) => console.log(m.sumar(1, 2)));
```

## Módulos integrados y el prefijo `node:`

Node.js incluye módulos listos para usar: `fs`, `path`, `http`, `os`, `events`, `stream`, `crypto`, `util`, `test`… Se recomienda importarlos con el prefijo **`node:`** (`require('node:fs')`), que deja claro que son integrados y no paquetes de npm.

```js
const os = require('node:os');
console.log(os.platform(), os.cpus().length);
```

## Cómo encuentra Node.js un módulo

- `require('./ruta')`: un fichero relativo (prueba `ruta.js`, `ruta.json` o la carpeta `ruta/index.js`).
- `require('paquete')`: busca en `node_modules`, subiendo por las carpetas padre.
- `require('node:fs')`: módulo integrado.

> **Consejo de seguridad:** si existe a la vez una carpeta `auth/` y un fichero `auth.js`, `require('./auth')` carga la carpeta. Evita nombres ambiguos y usa extensiones explícitas en caso de duda.

## Puntos clave

- CommonJS: `require` + `module.exports`. ESM: `import` + `export`.
- Usa el prefijo `node:` para los módulos integrados.
- Elige un sistema por proyecto; si necesitas mezclar, usa `import()` dinámico.

**Siguiente:** [El sistema de archivos](05-sistema-de-archivos.md)
