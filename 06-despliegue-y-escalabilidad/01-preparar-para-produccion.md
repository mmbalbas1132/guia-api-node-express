---
title: "Preparar la aplicación para producción"
description: "Lista de comprobación antes de desplegar: NODE_ENV, variables de entorno, apagado ordenado, health checks, logging, reinicios y systemd."
section: despliegue
order: 1
level: intermedio
tags: [produccion, node_env, graceful-shutdown, healthcheck, systemd, checklist]
prerequisites: [04-patron-repositorio]
tested_on: "Node.js 22 · Express 5.2"
---

# Preparar la aplicación para producción

«Producción» es la etapa en la que tu aplicación está disponible para usuarios reales. Lo que sirve en desarrollo (errores detallados, `console.log` por todas partes, ejecutar `node app.js` a mano) puede ser un problema en producción. Esta página resume qué revisar, basándose en las guías oficiales de Express.

## Lista de comprobación

### En el código

- [ ] **Manejador de errores** propio que no filtra el *stack trace* ni detalles internos.
- [ ] **Sin funciones síncronas** (`readFileSync`, `execSync`…) en el camino de las peticiones; solo se justifican durante el arranque. `node --trace-sync-io` detecta usos en desarrollo.
- [ ] **Logging adecuado**: no uses `console.log` para registrar la actividad en producción (es síncrono cuando escribe en terminal o fichero). Usa un logger (Pino es la opción recomendada por Express; Winston, ver [Logging](../09-calidad-y-mantenimiento/02-logging-con-winston.md)).
- [ ] **Todos los errores asíncronos gestionados** (`async/await` con Express 5). No escuches `uncaughtException` para «sobrevivir»: deja que el proceso caiga y que un supervisor lo reinicie.
- [ ] **Tareas de CPU intensiva** fuera del hilo principal (`worker_threads`, idealmente con un *pool* como `piscina`).
- [ ] **Compresión**: `compression` en la app o, mejor en alto tráfico, en el proxy inverso.
- [ ] **Seguridad**: Helmet, CORS, rate limiting, validación (ver [Seguridad](../03-seguridad/06-buenas-practicas-seguridad-node.md)).

### En el entorno

- [ ] **`NODE_ENV=production`**. Express cachea las vistas y devuelve errores menos verbosos; mejora notable de rendimiento.
- [ ] **Última versión LTS de Node.js**, y mantenla actualizada.
- [ ] **Configuración por variables de entorno**, inyectadas por la plataforma, nunca ficheros `.env` dentro del repositorio.
- [ ] **HTTPS** (TLS), normalmente terminado en un proxy inverso.
- [ ] **Reinicio automático** si la aplicación se cae y si el servidor se reinicia (systemd, Docker con `restart`, PM2…).
- [ ] **Varias instancias** (cluster o varios contenedores) para aprovechar todos los núcleos y tolerar fallos.
- [ ] **Usuario sin privilegios** para ejecutar el proceso.
- [ ] **Estado fuera del proceso**: si ejecutas varias instancias, las sesiones, cachés y contadores deben estar en un almacén compartido (Redis, base de datos), no en memoria.

## Apagado ordenado (*graceful shutdown*)

Al desplegar una nueva versión, el gestor de procesos envía una señal `SIGTERM` a la aplicación. Debe **dejar de aceptar peticiones nuevas, terminar las que están en curso, liberar recursos** (conexiones a la base de datos, ficheros bloqueados) y salir. Si no lo hace, se cortarán peticiones a medias.

```js
// src/server.js
const app = require('./app');
const { conectarDB, desconectarDB } = require('./config/db');

async function main() {
  await conectarDB();

  const server = app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Escuchando en el puerto ${port}`);
  });

  const apagar = (senal) => {
    console.log(`${senal} recibido: cerrando el servidor…`);
    server.close(async () => {          // deja de aceptar y espera a que terminen las activas
      await desconectarDB();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => apagar('SIGTERM'));
  process.on('SIGINT', () => apagar('SIGINT'));      // Ctrl+C
}

main().catch((err) => {
  console.error('No se pudo iniciar la aplicación:', err);
  process.exit(1);
});
```

> Con Docker, ejecuta Node.js **directamente** en el `CMD` (`CMD ["node", "src/server.js"]`, forma *exec*) para que reciba `SIGTERM`. Se comprobó que con esa forma el servidor del proyecto de ejemplo se cierra de forma ordenada al parar el contenedor.

## Health checks (comprobaciones de salud)

Un balanceador o un orquestador necesita saber si una instancia está sana. Expón un endpoint ligero:

```js
app.get('/salud', (req, res) => res.json({ estado: 'ok' }));
```

Kubernetes distingue dos tipos:

- **Liveness**: ¿el proceso está vivo o hay que reiniciarlo?
- **Readiness**: ¿está listo para recibir tráfico? (por ejemplo, ¿ya conectó a la base de datos?). Si no lo está, se retira de los balanceadores.

## Reinicio automático con systemd

En Linux, el sistema de inicio recomendado para vigilar el proceso es **systemd**. Un fichero `/etc/systemd/system/mi-api.service`:

```ini
[Unit]
Description=Mi API con Express
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /opt/mi-api/src/server.js
WorkingDirectory=/opt/mi-api
User=nobody
Group=nogroup
Environment=NODE_ENV=production
EnvironmentFile=/etc/mi-api.env
Restart=always
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mi-api      # arrancar y activar en el inicio del sistema
sudo journalctl -u mi-api -f            # ver los registros
```

> Ajusta las rutas (`node`, directorio de la aplicación) a tu servidor. `EnvironmentFile` permite guardar las variables (secretos) en un fichero fuera del repositorio con permisos restringidos.

Alternativas: un gestor de procesos como **PM2** (ver [Escalado](04-escalado-cluster-nginx-pm2.md)) instalado como servicio, o el orquestador de contenedores (Docker `restart: unless-stopped`, Kubernetes).

## Proxy inverso

No expongas Node.js directamente a Internet si puedes evitarlo. Pon delante **NGINX** (u otro proxy/balanceador) para:

- Terminar TLS (HTTPS).
- Servir archivos estáticos y comprimir.
- Balancear entre varias instancias.
- Absorber conexiones lentas (mitigación de ataques tipo Slowloris).

Detrás de un proxy, indica a Express que confíe en él para obtener la IP y el protocolo reales:

```js
app.set('trust proxy', 1);       // un salto de proxy
```

## Puntos clave

- `NODE_ENV=production`, LTS, logger asíncrono y errores controlados.
- Apagado ordenado con `SIGTERM` y endpoint de salud.
- Un supervisor (systemd, Docker, PM2) reinicia el proceso; nunca «sobrevivas» a excepciones no controladas.
- Proxy inverso delante y estado compartido si hay varias instancias.

**Siguiente:** [Plataformas de despliegue](02-plataformas-de-despliegue.md)
