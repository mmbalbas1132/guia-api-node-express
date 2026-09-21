---
title: "Configuración y variables de entorno"
description: "Gestionar secretos y configuración con process.env, ficheros .env (--env-file, loadEnvFile) y NODE_ENV."
section: fundamentos
order: 10
level: basico
tags: [env, configuracion, dotenv, node_env, secretos]
prerequisites: [09-servidor-http-nativo]
tested_on: "Node.js 22"
---

# Configuración y variables de entorno

Los datos que cambian entre entornos (puerto, cadena de conexión a la base de datos) y los **secretos** (claves de API, secreto de JWT) **no deben escribirse en el código**. Se leen de *variables de entorno*.

## `process.env`

`process` es un objeto global; `process.env` contiene las variables de entorno del proceso. Sus valores son siempre **cadenas de texto**.

```bash
# Linux / macOS
PORT=8080 node app.js

# Windows (PowerShell)
$env:PORT = 8080; node app.js
```

```js
const port = Number(process.env.PORT) || 3000;   // convertir a número y dar un valor por defecto
```

## Ficheros `.env`

Para no escribir las variables cada vez, guárdalas en un fichero `.env`:

```dotenv
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/mi-base
JWT_SECRET=un-secreto-largo-y-aleatorio
```

Node.js puede cargarlo **de forma nativa**, sin instalar nada:

```bash
node --env-file=.env app.js
```

Reglas de la opción `--env-file`:

- Puedes indicar varios ficheros (`--env-file=.env --env-file=.env.local`); los posteriores sobrescriben a los anteriores.
- Si una variable **ya existe en el entorno**, el valor del entorno tiene prioridad sobre el fichero.
- `--env-file-if-exists=.env` no falla si el fichero no existe (útil en producción, donde las variables las inyecta la plataforma).

También puedes cargarlo desde el código:

```js
const { loadEnvFile } = require('node:process');
loadEnvFile('.env');                 // o process.loadEnvFile('.env')
console.log(process.env.PORT);
```

Un script de desarrollo típico en `package.json`:

```json
{
  "scripts": {
    "dev": "node --watch --env-file=.env src/server.js"
  }
}
```

> **Alternativa:** el paquete `dotenv` (`require('dotenv').config()`) hace lo mismo y sigue siendo muy usado, sobre todo en proyectos que deben soportar versiones antiguas de Node.js.

## Buenas prácticas

1. **Nunca subas `.env` a Git.** Añádelo a `.gitignore`.
2. **Sube un `.env.example`** con los nombres de las variables (sin valores reales) para documentar qué hace falta:

   ```dotenv
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/api-tareas
   JWT_SECRET=cambia-esto-por-un-secreto-largo-y-aleatorio
   ```

3. **Valida la configuración al arrancar** y falla rápido si falta algo obligatorio, en lugar de descubrirlo cuando llegue la primera petición:

   ```js
   // src/config/env.js
   const requeridas = ['MONGODB_URI', 'JWT_SECRET'];

   for (const nombre of requeridas) {
     if (!process.env[nombre]) {
       throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
     }
   }

   module.exports = {
     port: Number(process.env.PORT) || 3000,
     mongodbUri: process.env.MONGODB_URI,
     jwtSecret: process.env.JWT_SECRET,
   };
   ```

4. Centraliza la lectura de `process.env` en **un único módulo** (como el de arriba) y usa ese módulo en el resto de la aplicación.
5. En producción, inyecta las variables con la plataforma de despliegue (Docker, systemd, panel del proveedor), no con ficheros dentro del repositorio.

## `NODE_ENV`

Muchas bibliotecas leen `NODE_ENV` para decidir su comportamiento. Aunque Node.js en sí no distingue entre desarrollo y producción, **en producción debes ejecutar con `NODE_ENV=production`**: Express, por ejemplo, cachea las plantillas y genera mensajes de error menos detallados, y el efecto en el rendimiento es notable.

```bash
NODE_ENV=production node src/server.js
```

> **Aviso:** usar `NODE_ENV` con otros valores (`staging`, `test-2`…) para cambiar el comportamiento del código se considera un antipatrón, porque hace imposible probar de forma fiable lo que llegará a producción. Para diferencias entre entornos, usa variables de configuración específicas (por ejemplo `LOG_LEVEL`, `DATABASE_URL`). La metodología [Twelve-Factor App](https://12factor.net/es/config) profundiza en este enfoque.

## Puntos clave

- Configuración y secretos, en variables de entorno; nunca en el código.
- `node --env-file=.env` carga `.env` sin dependencias.
- Valida al arrancar; sube `.env.example`, no `.env`.
- En producción: `NODE_ENV=production`.

**Siguiente:** [Fetch: cliente HTTP integrado](11-fetch-cliente-http.md)
