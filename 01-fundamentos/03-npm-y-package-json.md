---
title: "npm y package.json"
description: "Gestión de dependencias con npm: package.json, versionado semántico, scripts y buenas prácticas."
section: fundamentos
order: 3
level: basico
tags: [npm, package-json, dependencias, semver, scripts]
prerequisites: [02-instalacion-y-entorno]
tested_on: "npm 10 y 11"
---

# npm y package.json

**npm** es el gestor de paquetes estándar de Node.js (existen alternativas compatibles como Yarn y pnpm). Se encarga de descargar las bibliotecas que tu proyecto necesita, de guardarlas en la carpeta `node_modules` y de registrar qué versiones usas.

## Instalar dependencias

```bash
npm install express            # añade express a "dependencies"
npm install -D jest            # añade a "devDependencies" (equivale a --save-dev)
npm install                    # instala todo lo que figura en package.json
npm install express@5.2.1      # una versión concreta
npm install -g pm2             # instalación global (herramientas de línea de comandos)
```

Desde npm 5, `npm install <paquete>` **guarda automáticamente** la dependencia en `package.json`. Otras opciones: `--no-save` (instala sin registrar) y `--save-optional` / `-O` (dependencia opcional).

### `dependencies` frente a `devDependencies`

| Sección | Contenido | ¿Va a producción? |
|---|---|---|
| `dependencies` | Lo que tu aplicación necesita para funcionar (Express, Mongoose…) | Sí |
| `devDependencies` | Herramientas de desarrollo (pruebas, linters…) | No |

En producción se instalan solo las primeras: `npm ci --omit=dev`.

## Anatomía de `package.json`

```json
{
  "name": "api-tareas",
  "version": "1.0.0",
  "description": "API REST de gestión de tareas",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch --env-file=.env src/server.js",
    "test": "node --test"
  },
  "engines": { "node": ">=20" },
  "dependencies": {
    "express": "^5.2.1"
  },
  "devDependencies": {
    "supertest": "^7.2.2"
  }
}
```

- `main`: fichero de entrada del paquete.
- `scripts`: tareas que ejecutas con `npm run <nombre>` (`start` y `test` también se pueden lanzar como `npm start` y `npm test`).
- `engines`: versión de Node.js con la que funciona el proyecto.
- `"type": "module"`: opcional; hace que los `.js` se traten como ES Modules (ver [Módulos](04-modulos-commonjs-esm.md)).

## Versionado semántico (semver)

Las versiones tienen el formato `MAYOR.MENOR.PARCHE` (por ejemplo `5.2.1`):

- **PARCHE**: corrección de errores compatible.
- **MENOR**: nueva funcionalidad compatible.
- **MAYOR**: cambios que pueden romper la compatibilidad.

Los prefijos del rango en `package.json` controlan qué actualizaciones se aceptan:

| Rango | Acepta | Ejemplo con `1.2.3` |
|---|---|---|
| `^1.2.3` | Menores y parches (`>=1.2.3 <2.0.0`) | `1.9.0` sí, `2.0.0` no |
| `~1.2.3` | Solo parches (`>=1.2.3 <1.3.0`) | `1.2.9` sí, `1.3.0` no |
| `1.2.3` | Exactamente esa versión | — |

`npm install` añade por defecto el prefijo `^`.

## `package-lock.json`

Registra las versiones **exactas** instaladas (incluidas las dependencias de tus dependencias). Debe subirse a Git. Para instalar exactamente lo que dice el lockfile, de forma reproducible (CI, Docker, producción), usa:

```bash
npm ci
```

`npm ci` borra `node_modules` y falla si `package.json` y el lockfile no coinciden.

## Actualizar y auditar

```bash
npm outdated            # muestra qué paquetes tienen versiones nuevas
npm update              # actualiza dentro de los rangos permitidos
npm audit               # busca vulnerabilidades conocidas
```

## Scripts

Cualquier comando puede definirse como script:

```bash
npm run dev
npm run test
npm run start -- --port 8080     # los argumentos tras "--" se pasan al script
```

Node.js también puede ejecutarlos directamente con `node --run <script>`. Es un ejecutor más sencillo y rápido que npm, pero con menos funciones (por ejemplo, no ejecuta los scripts `pre` y `post`).

## `npx`: ejecutar paquetes sin instalarlos

```bash
npx sequelize-cli init      # ejecuta la herramienta usando la versión local o descargándola
```

## Seguridad de la cadena de suministro

Cada dependencia es código de terceros que se ejecuta en tu servidor. Buenas prácticas resumidas (detalle en [Buenas prácticas de seguridad](../03-seguridad/06-buenas-practicas-seguridad-node.md)):

- Mantén y **sube a Git** el `package-lock.json`, e instala con `npm ci` en CI y producción.
- Ejecuta `npm audit` con regularidad y en tu integración continua.
- Desconfía de paquetes con nombres casi idénticos a otros conocidos (*typosquatting*).
- Considera `npm config set ignore-scripts true` para no ejecutar scripts de instalación de paquetes de terceros.

## Puntos clave

- `dependencies` para producción, `devDependencies` para desarrollo.
- Semver: `^` acepta menores y parches; `~`, solo parches.
- `npm ci` para instalaciones reproducibles; `npm audit` para vulnerabilidades.

**Siguiente:** [Módulos: CommonJS y ES Modules](04-modulos-commonjs-esm.md)
