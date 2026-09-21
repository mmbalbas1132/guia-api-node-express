---
title: "Logging con Winston"
description: "Registros estructurados en una API Express: niveles, formatos JSON, transportes (consola y ficheros), registro de peticiones con morgan o middleware propio, y alternativas como Pino."
section: calidad
order: 2
level: intermedio
tags: [logging, winston, morgan, pino, observabilidad, produccion, mantenimiento]
prerequisites: [04-manejo-de-errores, 01-preparar-para-produccion]
tested_on: "Winston 3.19 · morgan 1.12 · Express 5.2 · Node.js 22 (ejemplos ejecutados)"
---

# Logging con Winston

Los **registros** (*logs*) son el diario de tu aplicación: qué ha pasado, cuándo y por qué falló. En producción, sin logs, no hay forma de diagnosticar un problema que ya ocurrió.

`console.log` sirve para depurar mientras desarrollas, pero se queda corto: no distingue **niveles** de importancia, no da un formato uniforme, no se puede enviar fácilmente a ficheros ni a servicios de monitorización, y no se puede filtrar. **Winston** es la biblioteca de logging más usada en Node.js y resuelve todo eso.

## Instalación y logger básico

```bash
npm install winston
```

```js
// src/config/logger.js
const winston = require('winston');

const enProduccion = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (enProduccion ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp(),           // añade la fecha y hora
    winston.format.errors({ stack: true }), // incluye la traza cuando se registra un Error
    winston.format.json()                 // una línea JSON por evento
  ),
  transports: [
    new winston.transports.Console({
      format: enProduccion
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

module.exports = logger;
```

Uso:

```js
const logger = require('./config/logger');

logger.info('Servidor iniciado', { puerto: 3000 });
logger.warn('Cuota de disco al 90 %');
logger.error('No se pudo conectar con la base de datos', { motivo: err.message });
logger.error(new Error('Fallo real'));        // registra mensaje y traza (gracias a format.errors)
```

Salida en desarrollo (legible, con colores):

```text
info: con metadatos {"timestamp":"2026-09-21T07:01:24.641Z","usuario":5}
```

Salida en producción (JSON, una línea por evento, fácil de procesar por máquinas):

```json
{"idPeticion":"999e38b0-…","level":"error","message":"boom","timestamp":"2026-09-21T07:01:24.560Z"}
```

## Niveles

Winston usa por defecto los niveles de npm, de **más a menos grave**:

| Nivel | Valor | Cuándo |
|---|---|---|
| `error` | 0 | Algo ha fallado y requiere atención |
| `warn` | 1 | Algo anómalo que no impide funcionar |
| `info` | 2 | Eventos normales relevantes (arranque, login…) |
| `http` | 3 | Peticiones HTTP |
| `verbose` | 4 | Detalle extra |
| `debug` | 5 | Información para depurar |
| `silly` | 6 | Máximo detalle |

La propiedad `level` del logger es el **umbral**: se registra ese nivel y los más graves. Con `level: 'info'`, los `debug` y `http` se descartan; con `level: 'debug'`, se ven todos salvo `silly`. Así puedes dejar mensajes de depuración en el código y activarlos solo cuando hagan falta (variable `LOG_LEVEL`).

## Transportes: a dónde van los registros

Un **transporte** es un destino. Puedes tener varios a la vez, cada uno con su nivel y su formato:

```js
const path = require('node:path');

const transports = [new winston.transports.Console()];

// Opcional: ficheros (útil en un servidor propio)
if (process.env.LOG_DIR) {
  transports.push(
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR, 'combined.log') })
  );
}
```

Aquí `error.log` guarda solo los errores y `combined.log` guarda todo.

> **Consejo:** en **contenedores y plataformas cloud** lo habitual es escribir **solo por consola** (`stdout`): la plataforma o el orquestador recoge la salida y la envía al sistema de logs. Escribir ficheros dentro de un contenedor obliga a gestionar permisos y volúmenes (y el proceso corre con un usuario sin privilegios). El proyecto de ejemplo escribe en consola y solo añade ficheros si defines `LOG_DIR`.
>
> Los ficheros crecen sin límite: en un servidor propio, gestiona la **rotación** con la herramienta `logrotate` del sistema o con el paquete `winston-daily-rotate-file`.

## Registrar los errores en el manejador central

El mejor sitio para registrar errores es el **manejador global** de Express: un único punto por el que pasan todos.

```js
function manejarErrores(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const nivel = status >= 500 ? 'error' : 'warn';     // un 4xx es culpa del cliente, no una alerta
  logger[nivel](err.message, { stack: err.stack, ruta: `${req.method} ${req.originalUrl}` });

  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : err.message,   // nada de detalles internos al cliente
  });
}
```

Se registra el detalle completo en el servidor, pero el cliente solo recibe un mensaje genérico en los `5xx`.

## Registrar las peticiones

### Opción A: morgan + Winston

**morgan** es un middleware que produce una línea por petición. Se conecta a Winston mediante un *stream*:

```bash
npm install morgan
```

```js
const morgan = require('morgan');

app.use(morgan('tiny', {
  stream: { write: (linea) => logger.http(linea.trim()) },
}));
```

Registro (nivel `http`): `GET /ok 200 11 - 4.085 ms`. Formatos predefinidos: `tiny`, `dev`, `combined` (estilo Apache)…

### Opción B: middleware propio con identificador de petición

Un **identificador por petición** permite seguir todos los mensajes de una misma petición. Con un *child logger*, todos los registros que haga esa petición llevan el id automáticamente:

```js
const { randomUUID } = require('node:crypto');

app.use((req, res, next) => {
  const inicio = process.hrtime.bigint();
  req.log = logger.child({ idPeticion: randomUUID() });      // logger con metadatos fijos

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    req.log.info('petición completada', {
      metodo: req.method, ruta: req.originalUrl, estado: res.statusCode, ms: Math.round(ms),
    });
  });
  next();
});

app.get('/ok', (req, res) => {
  req.log.debug('dentro del manejador');      // lleva el mismo idPeticion
  res.json({ ok: true });
});
```

## Qué registrar (y qué NO)

**Sí:** arranque y parada, errores con su traza, intentos de login fallidos, accesos denegados (`401`/`403`), operaciones sensibles (borrados, cambios de rol), tiempos de respuesta lentos, fallos de servicios externos.

**Nunca:** contraseñas, tokens JWT, números de tarjeta, datos personales innecesarios, cuerpos completos de peticiones que puedan contenerlos. Los logs suelen tener menos protección que la base de datos y circulan por más sistemas.

> **Aviso (inyección en logs):** no concatenes entrada del usuario directamente en el mensaje. Pásala como metadato (`logger.info('login', { email })`): en JSON queda correctamente escapada y no puede falsear líneas de registro.

Buenas prácticas generales:

- Usa **JSON estructurado** en producción; los agregadores de logs (ELK, Loki, servicios cloud) lo indexan directamente.
- Un **logger central** (`config/logger.js`) importado desde donde haga falta, en lugar de `console.log` repartidos por el código.
- **Nivel configurable** por variable de entorno.
- **Silencia el logger en los tests** (`silent: process.env.NODE_ENV === 'test'`) para no ensuciar la salida.

## Alternativas

- **`console.log` / `console.error`:** válido en scripts pequeños. Escriben en la salida estándar, y en algunos destinos (terminal o fichero) son síncronos, lo que puede afectar al rendimiento con mucho volumen.
- **Pino:** logger JSON muy rápido; es el que menciona la documentación de rendimiento de Express como alternativa a `console.log` para la actividad de la aplicación. Su integración con Express se hace con `pino-http`.
- **`debug`:** biblioteca para trazas de depuración activables con la variable `DEBUG` (Express la usa internamente). Útil para depurar, no como logging de producción.

## Puntos clave

- Un logger da niveles, formato uniforme y varios destinos; `console.log` no.
- `level` funciona como umbral y se configura por variable de entorno.
- En contenedores, registra por consola; los ficheros solo si tú gestionas el servidor (y su rotación).
- Registra los errores en el manejador central (`warn` para 4xx, `error` para 5xx) y no filtres detalles internos al cliente.
- Nunca registres contraseñas, tokens ni datos sensibles.

**Siguiente:** [Pruebas automatizadas](03-pruebas-automatizadas.md)
