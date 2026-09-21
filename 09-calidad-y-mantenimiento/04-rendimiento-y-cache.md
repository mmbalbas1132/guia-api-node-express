---
title: "Rendimiento y caché"
description: "Optimizar una API Node.js/Express: compresión, índices de base de datos, lean() y proyecciones, paginación, no bloquear el event loop y caché con Redis (cache-aside)."
section: calidad
order: 4
level: avanzado
tags: [rendimiento, cache, redis, compresion, indices, lean, paginacion, optimizacion]
prerequisites: [06-event-loop-y-asincronia, 03-mongodb-mongoose, 04-escalado-cluster-nginx-pm2]
tested_on: "Express 5.2 · compression 1.8 · Redis 7 · cliente redis 6.2 · Mongoose 9 sobre MongoDB en memoria · mediciones ejecutadas"
---

# Rendimiento y caché

La regla de oro: **mide antes de optimizar**. Optimizar sin datos suele complicar el código sin mejorar nada. Esta página recoge las mejoras de mayor impacto habitual, ordenadas de lo más barato a lo más elaborado, con las mediciones reales de los ejemplos.

## 0. Lo básico: modo producción

Arranca siempre con `NODE_ENV=production`. Express cachea plantillas y hojas de estilo y produce mensajes de error menos verbosos; la documentación de Express indica que tiene un efecto notable en el rendimiento. Usa además una versión LTS actual de Node.js.

## 1. Compresión de las respuestas

Comprimir el JSON o el HTML reduce mucho los bytes transferidos. El middleware `compression` lo hace de forma transparente cuando el cliente lo admite (`Accept-Encoding: gzip`):

```bash
npm install compression
```

```js
const compression = require('compression');
app.use(compression());          // colócalo pronto, antes de las rutas
```

Comprobado: una respuesta de 500 elementos con `Accept-Encoding: gzip` se envía con `Content-Encoding: gzip`, y sin esa cabecera se envía sin comprimir.

> **Nota:** en tráfico alto es preferible comprimir en el **proxy inverso** (NGINX) para no gastar CPU de Node.js. Ver [Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md).

## 2. Base de datos: la causa habitual de lentitud

En la mayoría de las APIs el cuello de botella no es Node.js, sino las consultas.

### Índices

Sin índice, la base de datos recorre **toda la colección** para responder una consulta (*collection scan*). Con un índice sobre el campo de búsqueda, va directa a los documentos. Medición real con 20 000 documentos y `explain('executionStats')`:

| | Etapa del plan | Documentos examinados | Devueltos |
|---|---|---|---|
| Sin índice | `COLLSCAN` | 20 000 | 20 |
| Con índice en `usuario` | `FETCH > IXSCAN` | 20 | 20 |

En Mongoose se declaran en el esquema:

```js
const tareaSchema = new Schema({
  usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', index: true },   // campo por el que se filtra
  titulo: String,
  completada: Boolean,
}, { timestamps: true });

tareaSchema.index({ usuario: 1, completada: 1 });     // índice compuesto para "mis tareas por estado"
```

Cómo comprobar que una consulta usa índice:

```js
const plan = await Tarea.find({ usuario: id }).explain('executionStats');
// busca IXSCAN en plan.queryPlanner.winningPlan (y COLLSCAN como señal de alarma)
```

Criterios: indexa los campos por los que **filtras u ordenas con frecuencia**, y los que forman relaciones (claves foráneas). No indexes todo: cada índice **ocupa espacio y ralentiza las escrituras**. En SQL (PostgreSQL) el concepto es idéntico (`CREATE INDEX`).

### `lean()`: documentos planos

Por defecto, Mongoose devuelve **documentos de Mongoose** (con métodos como `save()`, *getters*, seguimiento de cambios), lo cual es costoso. Si solo vas a leer y enviar JSON, usa `.lean()`:

```js
const tareas = await Tarea.find(filtro).lean();      // objetos JavaScript simples
```

Comprobado: los objetos de `lean()` son `Object` sin `save`. En una medición con 10 000 documentos, la consulta normal tardó 167 ms y con `lean()` 44 ms (los tiempos dependen del equipo; la proporción es lo importante). No lo uses cuando necesites modificar y guardar el documento.

### Proyección: pide solo lo que necesitas

```js
Usuario.find().select('nombre email').lean();     // no traigas campos que no vas a usar
```

### Paginación

Nunca devuelvas colecciones enteras. El proyecto de ejemplo pagina con `skip`/`limit` y limita `limit` a 100:

```js
const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
const datos = await Tarea.find(filtro).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
```

> **Nota:** `skip` con valores muy grandes se vuelve lento (la base de datos debe saltarse todos los anteriores). En listados enormes se usa **paginación por cursor** (filtrar por «los siguientes a este `_id`»).

### Otras prácticas

- Evita el problema **N+1**: no lances una consulta por cada elemento de una lista; usa `populate`, agregaciones o `IN`.
- Reutiliza el **pool de conexiones** del driver (una conexión creada al arrancar, no una por petición).
- Guarda los valores calculados que se consultan mucho (desnormalización controlada), ver [Modelado de datos](../04-bases-de-datos/02-modelado-de-datos.md).

## 3. No bloquees el event loop

Node.js ejecuta tu JavaScript en un solo hilo. Cualquier operación **síncrona o pesada de CPU** detiene a **todas** las peticiones mientras dura ([Event loop](../01-fundamentos/06-event-loop-y-asincronia.md)).

- Usa las versiones **asíncronas** de `fs`, `crypto` y similares en el código de las peticiones. Las funciones `Sync` se reservan para el arranque.
- Para cálculo intensivo, usa `worker_threads` con un *pool* de workers.
- Para detectar entradas/salidas síncronas accidentales en desarrollo: `node --trace-sync-io server.js`.
- Evita expresiones regulares con backtracking catastrófico sobre entrada del usuario (ReDoS) y procesar JSON gigantes (limita el tamaño con `express.json({ limit })`).
- Para aprovechar varios núcleos: `cluster`, PM2 o varios contenedores.

## 4. Caché con Redis

Cachear es **guardar el resultado de una operación costosa** para reutilizarlo. Es lo que más reduce la latencia cuando se leen con frecuencia datos que cambian poco.

**Redis** es una base de datos en memoria clave-valor, muy rápida, muy usada como caché. Además de acelerar, sirve de **almacén compartido** entre varias instancias de la API (sesiones, contadores del limitador de peticiones…), algo imposible con variables en memoria del proceso.

```bash
npm install redis
```

### El patrón *cache-aside*

1. La petición llega. Se busca la clave en Redis.
2. **Acierto (*hit*):** se devuelve lo guardado.
3. **Fallo (*miss*):** se ejecuta la operación costosa, se **guarda** el resultado con un tiempo de vida (TTL) y se devuelve.

```js
const { createClient } = require('redis');

const redis = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
redis.on('error', (err) => console.error('Redis:', err.message));
await redis.connect();                                       // al arrancar la aplicación

// Middleware de caché para rutas GET
function cache(segundos) {
  return async (req, res, next) => {
    const clave = `cache:${req.originalUrl}`;
    try {
      const guardado = await redis.get(clave);
      if (guardado) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(guardado));
      }
    } catch (err) {
      console.error('La caché falló, se continúa sin ella:', err.message);   // la caché nunca debe tumbar la API
      return next();
    }

    res.set('X-Cache', 'MISS');
    const enviarJson = res.json.bind(res);
    res.json = (cuerpo) => {
      if (res.statusCode === 200) {
        redis.set(clave, JSON.stringify(cuerpo), { EX: segundos }).catch(() => {});
      }
      return enviarJson(cuerpo);
    };
    next();
  };
}

app.get('/productos', cache(30), async (req, res) => {
  const productos = await Producto.find().lean();      // consulta costosa: solo en los fallos
  res.json(productos);
});
```

Resultado medido con una consulta simulada de 200 ms:

| Petición | `X-Cache` | Tiempo |
|---|---|---|
| 1.ª | `MISS` | 225 ms |
| 2.ª | `HIT` | 4 ms |
| 3.ª | `HIT` | 4 ms |

La consulta costosa se ejecutó **una sola vez** y el TTL quedó registrado en Redis (`EX: 30` = expira a los 30 segundos).

Detalles de la API del cliente `redis` (v6): `get(clave)`, `set(clave, valor, { EX: segundos })`, `del(clave)`, `ttl(clave)`, y `quit()` para cerrar la conexión. Redis guarda cadenas: los objetos se serializan con `JSON.stringify`/`JSON.parse`.

### Invalidación: lo difícil de la caché

> «Solo hay dos cosas difíciles en informática: invalidar la caché y nombrar cosas.» (dicho popular)

Cuando los datos cambian, la caché puede quedar **desactualizada**. Estrategias:

- **TTL corto:** aceptas datos algo antiguos durante unos segundos o minutos. Lo más simple.
- **Invalidación explícita:** al crear, modificar o borrar, elimina las claves afectadas.

  ```js
  await Producto.create(datos);
  await redis.del('cache:/productos');
  ```

- **Claves bien diseñadas:** incluye en la clave todo lo que cambia la respuesta (filtros, página, idioma).

> **Aviso de seguridad:** **no cachees respuestas específicas de un usuario con una clave compartida.** El middleware de arriba usa solo la URL como clave: es válido para datos **públicos**. Para datos de un usuario autenticado, incluye su id en la clave (`cache:${req.usuario.id}:${req.originalUrl}`) o no las caches; de lo contrario, un usuario podría recibir los datos de otro.

### Buenas prácticas con Redis

- **La caché es opcional:** si Redis cae, la API debe seguir funcionando (de ahí el `try/catch` y `next()`).
- Pon **siempre un TTL**; sin él, la memoria crece sin límite.
- No guardes datos sensibles sin necesidad ni expongas Redis a Internet: protégelo con contraseña y red privada.
- Con Docker Compose, añade un servicio `redis` y usa `redis://redis:6379` como URL.

## 5. Caché HTTP del navegador

Para respuestas que no cambian, las cabeceras `Cache-Control`/`ETag` evitan que el cliente vuelva a pedirlas. Express genera `ETag` por defecto y `express.static` acepta la opción `maxAge` para los archivos estáticos. Ver [Archivos estáticos](../02-express/08-archivos-estaticos-y-plantillas.md).

## Lista de comprobación de rendimiento

- [ ] `NODE_ENV=production` y Node.js LTS.
- [ ] Compresión (en la app o en NGINX).
- [ ] Índices en los campos de filtro/orden; `explain()` sin `COLLSCAN` en consultas frecuentes.
- [ ] `lean()` y `select()` en lecturas; paginación siempre.
- [ ] Sin funciones síncronas ni cálculo pesado en las rutas.
- [ ] Caché (con TTL e invalidación) para lecturas frecuentes de datos públicos.
- [ ] Varios procesos/contenedores para usar todos los núcleos.
- [ ] Medición (tiempos de respuesta, uso de CPU y memoria) antes y después de cada cambio.

## Puntos clave

- Mide primero: la mayoría de los problemas están en la base de datos, no en Node.js.
- Índices + `lean()` + paginación dan grandes mejoras con poco esfuerzo.
- Nunca bloquees el event loop.
- Redis con *cache-aside*: TTL siempre, invalidar al escribir, y no cachear datos por-usuario con clave compartida.

**Siguiente:** [Mantenimiento y buenas prácticas](05-mantenimiento-y-buenas-practicas.md)
