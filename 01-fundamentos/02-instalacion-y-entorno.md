---
title: "Instalación y entorno de trabajo"
description: "Instalar Node.js LTS, preparar las herramientas de desarrollo y ejecutar tu primer script."
section: fundamentos
order: 2
level: basico
tags: [instalacion, entorno, cli, vscode, git, postman]
prerequisites: [01-que-es-nodejs]
tested_on: "Node.js 22 y 24 LTS"
---

# Instalación y entorno de trabajo

## Herramientas recomendadas

Además de Node.js necesitarás unas pocas herramientas comunes de desarrollo:

| Herramienta | Para qué sirve |
|---|---|
| **Editor de código** (por ejemplo Visual Studio Code) | Escribir y depurar el código |
| **Git** | Control de versiones y despliegue |
| **Terminal** (PowerShell, Terminal de macOS, bash…) | Ejecutar comandos de Node.js y npm |
| **Cliente HTTP** (Postman, Insomnia, Bruno o `curl`) | Probar tus APIs sin necesidad de un frontend |

## Instalar Node.js

1. Entra en [nodejs.org/en/download](https://nodejs.org/en/download) y descarga la versión **LTS** para tu sistema operativo (instalador para Windows/macOS, o el método que indique la página para Linux).
2. Sigue el asistente de instalación. Se instalan juntos `node` y `npm`.
3. Alternativas: usar un gestor de versiones (como `nvm` o `fnm`) para cambiar de versión de Node.js fácilmente entre proyectos, o la imagen oficial de Docker (`docker pull node:24-slim`).

Comprueba la instalación en una terminal:

```bash
node -v    # p. ej. v24.x.x
npm -v     # p. ej. 11.x.x
```

## Tu primer script

Crea un fichero `hola.js`:

```js
const nombre = 'Node.js';
console.log(`¡Hola desde ${nombre}!`);
console.log('Versión:', process.version);
```

Y ejecútalo:

```bash
node hola.js
```

`console.log`, `setTimeout` o `process` son **globales**: están disponibles sin importar nada.

## REPL: probar código al vuelo

Si ejecutas `node` sin argumentos se abre una consola interactiva (REPL) donde puedes probar expresiones. También puedes ejecutar una línea suelta con `-e`:

```bash
node -e "console.log(2 ** 10)"   # 1024
```

## Opciones útiles de la línea de comandos

Node.js incluye hoy funciones que antes requerían paquetes externos:

| Opción | Qué hace |
|---|---|
| `node --watch app.js` | Reinicia el programa automáticamente al guardar cambios (sustituye a `nodemon` en la mayoría de casos) |
| `node --env-file=.env app.js` | Carga variables de entorno desde un fichero `.env` (ver [Configuración](10-configuracion-y-variables-de-entorno.md)) |
| `node --run <script>` | Ejecuta un script de `package.json` sin pasar por npm |
| `node --test` | Ejecuta las pruebas con el *test runner* integrado (ver [Pruebas automatizadas](../09-calidad-y-mantenimiento/03-pruebas-automatizadas.md)) |
| `node -e "código"` | Ejecuta código directamente |

## Crear un proyecto

Cada proyecto Node.js tiene un fichero `package.json` que describe sus dependencias y scripts:

```bash
mkdir mi-proyecto
cd mi-proyecto
npm init -y        # crea package.json con valores por defecto
```

Añade un script de arranque y de desarrollo:

```json
{
  "name": "mi-proyecto",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  }
}
```

```bash
npm run dev       # desarrollo con reinicio automático
npm start         # arranque normal
```

## Ejecutar un script como programa (shebang)

En Linux y macOS puedes convertir un script en ejecutable añadiendo una primera línea especial:

```js
#!/usr/bin/env node
console.log('Soy un script ejecutable');
```

```bash
chmod u+x script.js
./script.js
```

## Puntos clave

- Instala siempre la versión LTS y compruébala con `node -v`.
- `node --watch` evita reiniciar a mano durante el desarrollo.
- Cada proyecto empieza con `npm init` y su `package.json`.

**Siguiente:** [npm y package.json](03-npm-y-package-json.md)
