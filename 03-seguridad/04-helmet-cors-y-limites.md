---
title: "Helmet, CORS y límites de uso"
description: "Cabeceras de seguridad con Helmet, control de orígenes con CORS, límite de tamaño del cuerpo y limitación de peticiones contra fuerza bruta."
section: seguridad
order: 4
level: intermedio
tags: [helmet, cors, rate-limit, seguridad, cabeceras, fuerza-bruta]
prerequisites: [03-autorizacion-roles]
tested_on: "helmet 8 · cors 2 · express-rate-limit 8 · Express 5.2"
---

# Helmet, CORS y límites de uso

Tres piezas de configuración que toda API pública debería tener.

```bash
npm install helmet cors express-rate-limit
```

## Helmet: cabeceras HTTP de seguridad

`helmet` es un middleware que establece cabeceras de seguridad que mitigan vulnerabilidades web conocidas.

```js
const helmet = require('helmet');

app.use(helmet());       // regístralo lo antes posible, antes de las rutas
```

Cabeceras que establece por defecto:

| Cabecera | Para qué sirve |
|---|---|
| `Content-Security-Policy` | Lista de permitidos de lo que puede cargar/ejecutar la página; mitiga XSS |
| `Strict-Transport-Security` | Indica al navegador que use siempre HTTPS |
| `X-Content-Type-Options: nosniff` | Evita que el navegador «adivine» tipos MIME |
| `X-Frame-Options` | Mitiga *clickjacking* (que tu página se incruste en otra) |
| `Referrer-Policy` | Controla qué información se envía en `Referer` |
| `Cross-Origin-Opener-Policy` / `Cross-Origin-Resource-Policy` / `Origin-Agent-Cluster` | Aislamiento entre orígenes |
| `X-DNS-Prefetch-Control`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies` | Comportamientos heredados de navegadores/Adobe |
| `X-Powered-By` | **Se elimina**: no revela que usas Express |
| `X-XSS-Protection` | Se desactiva (`0`): el filtro heredado empeoraba la situación |

Cada cabecera se puede configurar o desactivar (por ejemplo, ajustar la CSP si sirves HTML con scripts propios).

### Reducir la huella (*fingerprinting*)

Si no usas Helmet, al menos desactiva la cabecera que delata el framework, y personaliza las respuestas 404 y de error para no filtrar información:

```js
app.disable('x-powered-by');
```

Deshabilitarla no impide que un atacante sofisticado descubra que usas Express, pero descarta ataques casuales.

## CORS: compartir recursos entre orígenes

Por seguridad, los navegadores impiden que una página de un origen (`https://miapp.com`) haga peticiones `fetch` a otro origen (`https://api.miapp.com`) a menos que el servidor lo autorice mediante cabeceras **CORS**. Es necesario cuando tu frontend y tu API viven en dominios o puertos distintos.

```js
const cors = require('cors');

// Permitir un conjunto concreto de orígenes
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://miapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

Detalles importantes:

- `app.use(cors())` sin opciones permite **cualquier origen** (`*`). Aceptable para APIs públicas de solo lectura; en el resto, restringe la lista.
- CORS **lo aplica el navegador**, no el servidor: una petición desde un origen no permitido sigue llegando al servidor y este responde con normalidad; simplemente el navegador no entrega la respuesta a la página. No sustituye a la autenticación.
- Para peticiones «no simples» (con `Authorization` o `Content-Type: application/json`), el navegador envía antes una petición **preflight** `OPTIONS`; el middleware `cors` la responde automáticamente.
- Guarda los orígenes permitidos en variables de entorno (`CORS_ORIGIN`) para poder cambiarlos por entorno.

## Límite de tamaño del cuerpo

Evita que un cliente envíe cuerpos enormes que consuman memoria:

```js
app.use(express.json({ limit: '100kb' }));
```

## Limitar el número de peticiones (*rate limiting*)

Protege el login frente a **fuerza bruta** y la API frente al abuso. La página de seguridad de Express recomienda bloquear por combinaciones de intentos fallidos (mismo usuario e IP, y muchos fallos desde una IP en un periodo largo). Con `express-rate-limit` la versión sencilla es limitar por IP:

```js
const { rateLimit } = require('express-rate-limit');

const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,        // ventana de 15 minutos
  limit: 10,                        // máximo 10 peticiones por IP en la ventana
  standardHeaders: 'draft-8',       // cabeceras estándar RateLimit-*
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, inténtalo más tarde' },
});

app.use('/auth/login', limitadorLogin);

// Un límite general más holgado para el resto de la API
app.use(rateLimit({ windowMs: 60 * 1000, limit: 100 }));
```

Al superar el límite, el servidor responde con **`429 Too Many Requests`**.

> **Detrás de un proxy inverso** (NGINX, un balanceador, PaaS): configura `app.set('trust proxy', 1)` para que `req.ip` sea la IP real del cliente y no la del proxy; si no, todos los usuarios compartirían el mismo contador. Con varias instancias de la API, el contador debe guardarse en un almacén compartido (por ejemplo, Redis); el de memoria es local a cada proceso.

Para reglas más elaboradas (bloqueo por usuario+IP, penalizaciones progresivas), el paquete `rate-limiter-flexible` es el que recomienda la documentación de Express.

## Orden recomendado de middleware de seguridad

```js
app.set('trust proxy', 1);                 // solo si hay un proxy delante
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') }));
app.use(rateLimit({ windowMs: 60_000, limit: 100 }));
app.use(express.json({ limit: '100kb' }));
// … rutas … 404 … manejador de errores
```

## Puntos clave

- `helmet()` con una línea añade una buena batería de cabeceras.
- CORS es una política del navegador; configura una lista de orígenes explícita.
- Limita el tamaño del cuerpo y el ritmo de peticiones (sobre todo en el login).

**Siguiente:** [Sanitización y validación de entrada](05-sanitizacion-y-validacion-entrada.md)
