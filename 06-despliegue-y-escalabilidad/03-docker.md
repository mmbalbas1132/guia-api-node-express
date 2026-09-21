---
title: "Docker: empaquetar la aplicación"
description: "Crear una imagen Docker de una API Node.js, ejecutarla, y orquestarla con MongoDB mediante Docker Compose."
section: despliegue
order: 3
level: intermedio
tags: [docker, dockerfile, compose, contenedores, despliegue]
prerequisites: [02-plataformas-de-despliegue]
tested_on: "Docker 29 · Compose 5 · imagen node:24-slim · MongoDB 8"
---

# Docker: empaquetar la aplicación

**Docker** empaqueta tu aplicación junto con su entorno (versión de Node.js, dependencias, configuración) en una **imagen**. Esa imagen se ejecuta como **contenedor** en cualquier máquina con Docker, eliminando el «en mi máquina funciona». Instálalo desde docs.docker.com/get-docker.

## Dockerfile

El `Dockerfile` describe cómo construir la imagen. Este es el del [proyecto de ejemplo](../08-proyecto-api-tareas/02-implementacion-paso-a-paso.md):

```dockerfile
FROM node:24-slim

WORKDIR /app
ENV NODE_ENV=production

# Primero solo los manifiestos: así la capa de dependencias se cachea
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# La imagen oficial incluye el usuario "node" (sin privilegios de root)
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
```

Qué hace cada instrucción:

| Instrucción | Función |
|---|---|
| `FROM node:24-slim` | Imagen base oficial de Node.js (versión LTS). `-slim` es una variante ligera; existe también `-alpine` |
| `WORKDIR /app` | Directorio de trabajo dentro del contenedor |
| `ENV NODE_ENV=production` | Activa el modo producción |
| `COPY package*.json ./` + `RUN npm ci --omit=dev` | Instala solo las dependencias de producción, de forma reproducible |
| `COPY src ./src` | Copia el código (después de las dependencias, para aprovechar la caché de capas) |
| `USER node` | Ejecuta el proceso sin privilegios de administrador |
| `EXPOSE 3000` | Documenta el puerto (no lo publica) |
| `CMD [...]` | Comando de arranque. Forma *exec* (array) para que Node.js reciba `SIGTERM` |

> **Versión de Node.js:** usa una versión LTS vigente. Muchos ejemplos antiguos usan `node:18-alpine`, una versión que ya ha llegado al fin de su soporte.

### `.dockerignore`

Evita copiar al contexto de construcción ficheros que no deben ir en la imagen:

```text
node_modules
npm-debug.log
.env
.git
tests
```

Especialmente importante: **nunca** metas `.env` (secretos) dentro de la imagen.

## Construir y ejecutar

```bash
docker build -t api-tareas .

docker run -p 3000:3000 \
  -e JWT_SECRET=un-secreto-largo \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/api-tareas \
  api-tareas
```

- `-p 3000:3000` publica el puerto del contenedor en el de tu máquina.
- `-e` define variables de entorno (o `--env-file .env` para leerlas de un fichero local).
- Dentro de un contenedor, `localhost` es **el propio contenedor**, no tu máquina: para llegar a un MongoDB que corre en tu equipo se usa `host.docker.internal` (Docker Desktop) o, mejor, se conectan por red Docker como se ve a continuación.

## Docker Compose: la API con su base de datos

Compose define y arranca varios contenedores a la vez. Fichero `docker-compose.yml`:

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      MONGODB_URI: mongodb://mongo:27017/api-tareas    # "mongo" es el nombre del servicio
      JWT_SECRET: ${JWT_SECRET:?define JWT_SECRET en el entorno o en un fichero .env}
    depends_on:
      - mongo

  mongo:
    image: mongo:8
    volumes:
      - mongo-data:/data/db          # los datos sobreviven a reinicios del contenedor

volumes:
  mongo-data:
```

```bash
export JWT_SECRET=un-secreto-largo
docker compose up -d --build       # construye y arranca en segundo plano
docker compose logs -f api         # ver los registros de la API
docker compose stop                # detener (la API recibe SIGTERM y se cierra de forma ordenada)
docker compose down                # eliminar contenedores (añade -v para borrar también los datos)
```

Los servicios se encuentran entre sí por **nombre** (la API usa `mongo` como host). Comprobado: con esta configuración la API arranca, registra un usuario en MongoDB, corre con el usuario `node` (uid 1000) y se cierra correctamente al recibir `SIGTERM`.

> **Nota:** `depends_on` solo controla el orden de arranque, no espera a que MongoDB esté listo para aceptar conexiones. Mongoose espera a que haya un servidor disponible hasta `serverSelectionTimeoutMS` (30 segundos por defecto) antes de fallar, lo que suele bastar en desarrollo; en producción usa *healthchecks* de Compose o un reintento propio en `conectarDB`.

## Buenas prácticas

- **Imágenes pequeñas y con versión fija** (`node:24-slim`, no `latest`).
- **Ejecuta como usuario no root** (`USER node`).
- **Un proceso por contenedor**; para escalar, lanza más contenedores.
- **Secretos por variables de entorno o secretos de la plataforma**, nunca dentro de la imagen.
- **Datos persistentes en volúmenes**, no en el sistema de ficheros del contenedor.
- Construye con `npm ci` para reproducibilidad y ejecuta `npm audit` en CI antes de publicar.
- No uses `npm start` como `CMD` si quieres una gestión de señales predecible; ejecuta `node` directamente.

## Escalado horizontal con contenedores

Al ser cada contenedor una instancia idéntica y sin estado, puedes lanzar varios detrás de un balanceador. Docker Swarm o Kubernetes automatizan ese reparto, el reinicio de contenedores caídos y las actualizaciones progresivas. Ver [Escalado](04-escalado-cluster-nginx-pm2.md).

## Puntos clave

- Imagen = aplicación + entorno; contenedor = imagen en ejecución.
- Copia primero `package*.json` e instala dependencias para aprovechar la caché.
- Compose une la API y la base de datos; los servicios se resuelven por nombre.

**Siguiente:** [Escalado: cluster, NGINX y PM2](04-escalado-cluster-nginx-pm2.md)
