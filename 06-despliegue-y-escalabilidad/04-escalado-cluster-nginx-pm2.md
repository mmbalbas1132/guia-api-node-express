---
title: "Escalado: cluster, NGINX y PM2"
description: "Escalabilidad vertical y horizontal, módulo cluster, balanceo de carga con NGINX, PM2 y worker threads."
section: despliegue
order: 4
level: avanzado
tags: [escalabilidad, cluster, nginx, pm2, balanceo, worker-threads]
prerequisites: [03-docker]
tested_on: "Node.js 22 · PM2 7 · NGINX estable (nginx -t)"
---

# Escalado: cluster, NGINX y PM2

**Escalabilidad** es la capacidad de una aplicación para atender más carga añadiendo recursos. Hay dos enfoques:

| Enfoque | Qué es | Ventajas | Inconvenientes |
|---|---|---|---|
| **Vertical** (*scale up*) | Más CPU, RAM o disco en la **misma** máquina | Sencillo; sin cambios en la app | Tiene un techo físico y de coste; sigue siendo un único punto de fallo |
| **Horizontal** (*scale out*) | **Más** máquinas, procesos o contenedores repartiendo la carga | Escala casi sin límite; tolerancia a fallos | Requiere balanceador, estado compartido y más infraestructura |

Node.js ejecuta el código JavaScript en **un solo hilo**, por lo que una instancia usa **un solo núcleo**. Para aprovechar una máquina de varios núcleos hay que ejecutar **varios procesos**.

## El módulo `cluster`

`node:cluster` lanza varios procesos de la misma aplicación (uno por núcleo) que **comparten el mismo puerto**. Un proceso *primario* los crea y el sistema reparte las conexiones entre ellos.

```js
// cluster.js
const cluster = require('node:cluster');
const http = require('node:http');
const os = require('node:os');

if (cluster.isPrimary) {
  const n = os.availableParallelism();               // número de núcleos disponibles
  console.log(`Primario ${process.pid}: lanzando ${n} workers`);

  for (let i = 0; i < n; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} terminó. Creando uno nuevo…`);
    cluster.fork();                                   // reemplaza al worker caído
  });
} else {
  http
    .createServer((req, res) => res.end(`Atendido por el worker ${process.pid}\n`))
    .listen(3000);
}
```

> **Nota de versión:** `cluster.isMaster` (que aparece en muchos ejemplos) está **obsoleto**; usa `cluster.isPrimary`. Y `os.availableParallelism()` es la forma actual de saber cuántos procesos paralelos caben (equivale a `os.cpus().length` en la mayoría de casos).

**Importante:** cada worker es un proceso separado con **su propia memoria**. No puedes guardar estado en variables de la aplicación (contadores, sesiones, cachés) esperando que las vean todos. Usa un almacén compartido como **Redis** o la base de datos.

## PM2: gestor de procesos

**PM2** ejecuta la aplicación en segundo plano, la reinicia si cae, gestiona los registros y puede lanzar el modo cluster **sin cambiar el código**.

```bash
npm install -g pm2

pm2 start src/server.js --name api-tareas          # una instancia
pm2 start src/server.js --name api-tareas -i max   # modo cluster: una instancia por núcleo
pm2 start src/server.js --name api-tareas -i 4     # 4 instancias

pm2 list                     # estado de los procesos
pm2 logs                     # registros en vivo
pm2 restart api-tareas       # reiniciar
pm2 reload api-tareas        # reinicio sin cortes (una instancia cada vez)
pm2 stop api-tareas
pm2 delete api-tareas

pm2 save                     # guarda la lista actual de procesos
pm2 startup                  # muestra el comando para arrancar PM2 al iniciar el sistema
```

Con `-i 2` se comprobó que las peticiones se reparten entre los dos procesos (los PID de las respuestas alternan).

> **Recomendación oficial:** aunque PM2 fue históricamente muy popular, la documentación de Express recomienda usar el **sistema de inicio del sistema operativo (systemd)** para la gestión de procesos, o bien ejecutar el gestor de procesos como servicio de systemd. En entornos con contenedores, el orquestador (Docker, Kubernetes) ya se encarga de reiniciar y replicar.

## Balanceo de carga con NGINX

Cuando tienes varias instancias (en puertos distintos, en varias máquinas o en varios contenedores), **NGINX** puede actuar como *proxy inverso y balanceador*: recibe todas las peticiones y las reparte.

```nginx
# Balanceo de carga entre tres instancias de la API (por defecto: round-robin)
upstream api_backend {
    # least_conn;        # alternativa: enviar a la instancia con menos conexiones activas
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    keepalive 32;
}

server {
    listen 80;
    server_name api.ejemplo.com;

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io / WebSockets necesitan cabeceras de actualización de protocolo
    location /socket.io/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Esta configuración se validó con `nginx -t`. Colócala en `/etc/nginx/conf.d/` (o `sites-available` según la distribución), comprueba con `sudo nginx -t` y recarga con `sudo systemctl reload nginx`.

Algoritmos de reparto habituales: *round-robin* (por defecto, en turnos), `least_conn` (menos conexiones activas) e `ip_hash` (mismo cliente → misma instancia; útil si necesitas «afinidad de sesión»).

En tu aplicación Express: `app.set('trust proxy', 1)` para obtener la IP real del cliente.

> **Sesiones y WebSockets con varias instancias:** con Socket.io necesitas *sticky sessions* (afinidad) o un adaptador compartido (por ejemplo Redis) para que los mensajes lleguen a clientes conectados a instancias distintas.

## Hilos de trabajo (`worker_threads`)

`cluster` escala **peticiones concurrentes** entre procesos. Si una única petición hace trabajo intensivo de CPU (procesar imágenes, cifrado, cálculos), bloquea el event loop de su proceso. Para eso existen los **worker threads**, que ejecutan JavaScript en paralelo dentro del mismo proceso:

```js
const { Worker } = require('node:worker_threads');

app.post('/redimensionar', (req, res, next) => {
  const worker = new Worker('./resize-worker.js', { workerData: req.body.imagen });
  worker.once('message', (resultado) => res.send(resultado));
  worker.once('error', next);
});
```

Crear un worker por petición es caro; en producción usa un **pool** fijo de workers, por ejemplo con la biblioteca `piscina`. Los datos se **copian** entre hilos (o se transfieren/comparten mediante `ArrayBuffer`/`SharedArrayBuffer`). Los worker threads **no sustituyen** al cluster: se complementan.

## Escalado horizontal con contenedores

Con Docker, lanzas varias réplicas de la misma imagen detrás del balanceador. Docker Swarm o Kubernetes automatizan el reparto y el reinicio. Servicios cloud como los balanceadores de carga de AWS (Elastic Load Balancer) cumplen la función de NGINX de forma gestionada.

## Cuándo escalar

1. **Mide antes de optimizar:** perfila y localiza el cuello de botella (CPU, base de datos, red).
2. Optimiza lo barato primero: índices en la base de datos, caché (Redis), compresión, paginación.
3. Aprovecha todos los núcleos (cluster/PM2 o varios contenedores).
4. Escala verticalmente mientras sea sencillo y barato; pasa a horizontal cuando necesites más capacidad o tolerancia a fallos.

## Puntos clave

- Una instancia de Node.js = un núcleo: usa `cluster`, PM2 (`-i max`) o varios contenedores.
- Los procesos no comparten memoria: el estado va a Redis o a la base de datos.
- NGINX reparte el tráfico entre instancias (`upstream`) y termina TLS.
- Los `worker_threads` son para CPU intensiva, no para escalar peticiones.

**Siguiente sección:** [Tiempo real con WebSockets](../07-tiempo-real/01-websockets-y-socketio.md)
