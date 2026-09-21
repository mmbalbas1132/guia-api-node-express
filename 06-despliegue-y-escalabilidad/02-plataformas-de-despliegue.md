---
title: "Plataformas de despliegue"
description: "Opciones para publicar una API Node.js: PaaS (Heroku), serverless (Vercel) y servidores virtuales (DigitalOcean con NGINX y PM2)."
section: despliegue
order: 2
level: intermedio
tags: [despliegue, heroku, vercel, digitalocean, nginx, pm2, vps, paas]
prerequisites: [01-preparar-para-produccion]
tested_on: "Guía de referencia (los comandos de plataformas externas no se ejecutaron)"
---

# Plataformas de despliegue

Hay tres grandes formas de publicar una API Node.js. Todas requieren lo visto en [Preparar para producción](01-preparar-para-produccion.md). Los servicios cloud cambian con frecuencia (precios, planes, comandos): **consulta siempre la documentación oficial vigente** de la plataforma que elijas.

| Modelo | Ejemplos | Control | Esfuerzo operativo | Adecuado para |
|---|---|---|---|---|
| **PaaS** (plataforma como servicio) | Heroku, Render, Railway, Fly.io | Medio | Bajo | Empezar rápido, equipos pequeños |
| **Serverless / funciones** | Vercel, AWS Lambda, Cloudflare Workers | Bajo | Muy bajo | APIs con carga variable, frontends con backend ligero |
| **VPS / servidor virtual** | DigitalOcean, Hetzner, AWS EC2 | Total | Alto | Control completo, WebSockets, procesos persistentes |

## Requisito común: el puerto

Muchas plataformas te asignan el puerto mediante la variable de entorno `PORT`. Tu aplicación debe **leerlo** en lugar de fijarlo:

```js
const port = Number(process.env.PORT) || 3000;
app.listen(port);
```

Y todas las plataformas dan un mecanismo para definir las variables de entorno (`MONGODB_URI`, `JWT_SECRET`…): úsalo en lugar de subir un `.env`.

## PaaS: Heroku

Un PaaS se ocupa de la infraestructura: subes tu código y él lo construye, lo ejecuta y lo escala. Heroku fue el ejemplo clásico. Ten en cuenta que **ya no ofrece un plan gratuito**: revisa los planes y precios vigentes en su web.

Pasos típicos con la CLI de Heroku (instalada desde su documentación oficial) y Git:

```bash
heroku login
git init                              # si el proyecto aún no es un repositorio
heroku create mi-api                  # crea la aplicación y añade el remoto "heroku"
```

Crea un fichero **`Procfile`** en la raíz que indique cómo arrancar el proceso web:

```text
web: node src/server.js
```

Configura las variables y despliega:

```bash
heroku config:set JWT_SECRET=un-secreto-largo MONGODB_URI=mongodb+srv://...
git add .
git commit -m "Despliegue en Heroku"
git push heroku main
```

Heroku detecta el proyecto Node.js, ejecuta `npm install`, y arranca el proceso indicado en el `Procfile` (o el script `start` de `package.json`). Necesitarás una base de datos accesible desde Internet (por ejemplo MongoDB Atlas o un complemento de base de datos de la propia plataforma).

## Serverless: Vercel

Vercel está optimizado para frontends y funciones bajo demanda, y admite backends Node.js. Según su documentación, las aplicaciones Express pueden desplegarse con configuración mínima. El flujo básico con su CLI:

```bash
npm install -g vercel
vercel                # asistente interactivo: enlaza y despliega el proyecto
```

Consideraciones: en el modelo de funciones bajo demanda el proceso **no es persistente**, por lo que no se adaptan bien las conexiones de larga duración como WebSockets ni el estado en memoria. Según su documentación, la aplicación Express se despliega como **una única función**: debe exportar `app` (`module.exports = app`) o usar `app.listen`, y `express.static()` **no sirve** archivos estáticos (van en la carpeta `public/`, que sirve su CDN). Consulta la página oficial ([vercel.com/docs/frameworks/backend/express](https://vercel.com/docs/frameworks/backend/express)) para las limitaciones vigentes.

## VPS: DigitalOcean (u otro servidor virtual)

Un VPS te da un servidor Linux completo. Tienes **control total**, y también **toda la responsabilidad**: instalar, asegurar y mantener el sistema. Resumen del proceso (Ubuntu como ejemplo):

1. **Crear el servidor** (en DigitalOcean se llama *droplet*), añadir tu clave SSH.
2. **Conectar por SSH:** `ssh usuario@IP_DEL_SERVIDOR`.
3. **Instalar Node.js LTS** (con el método que indique nodejs.org, o un gestor de versiones) y Git.
4. **Traer el código y las dependencias:**

   ```bash
   git clone https://github.com/tu-usuario/tu-api.git /opt/mi-api
   cd /opt/mi-api
   npm ci --omit=dev
   ```

5. **Definir las variables de entorno** (fichero con permisos restringidos, `EnvironmentFile` de systemd, o el gestor de procesos).
6. **Ejecutar la app de forma persistente** con systemd (ver [página anterior](01-preparar-para-produccion.md)) o con **PM2**:

   ```bash
   npm install -g pm2
   pm2 start src/server.js --name mi-api
   pm2 save               # guarda la lista de procesos
   pm2 startup            # genera el comando para arrancar PM2 al iniciar el sistema
   ```

7. **Configurar NGINX como proxy inverso**, para que atienda en los puertos 80/443 y reenvíe a tu app (por ejemplo en el puerto 3000):

   ```nginx
   server {
       listen 80;
       server_name api.midominio.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Y en Express: `app.set('trust proxy', 1)`.

8. **HTTPS**: obtén un certificado gratuito de Let's Encrypt (por ejemplo con `certbot`) y configura la redirección de HTTP a HTTPS.
9. **Cortafuegos**: abre solo los puertos necesarios (22 para SSH, 80 y 443); el puerto de Node.js (3000) no debe ser accesible desde fuera.

## Con Docker

Otra vía, independiente de la plataforma, es empaquetar la aplicación en un contenedor y desplegar ese contenedor en cualquier sitio que lo admita (PaaS, VPS, Kubernetes). Se explica en la [siguiente página](03-docker.md).

## Integración y despliegue continuos (CI/CD)

Automatiza las pruebas y el despliegue con GitHub Actions, GitLab CI u otras herramientas: en cada *push* se instalan dependencias con `npm ci`, se ejecutan `npm test` y `npm audit`, y si todo pasa se despliega. Reduce errores manuales y hace los despliegues repetibles.

## Puntos clave

- Lee el puerto de `process.env.PORT` y las credenciales de variables de entorno.
- PaaS = rapidez; serverless = mínimo mantenimiento; VPS = control total.
- En un VPS: systemd o PM2 + NGINX + HTTPS + cortafuegos.

**Siguiente:** [Docker](03-docker.md)
