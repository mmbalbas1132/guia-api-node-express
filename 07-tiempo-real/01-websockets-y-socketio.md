---
title: "Tiempo real con WebSockets y Socket.io"
description: "Comunicación bidireccional en tiempo real: WebSockets frente a HTTP, servidor y cliente con Socket.io, salas, autenticación y casos de uso."
section: tiempo-real
order: 1
level: intermedio
tags: [websockets, socketio, tiempo-real, chat, notificaciones, rooms]
prerequisites: [04-escalado-cluster-nginx-pm2]
tested_on: "Socket.io 4.8 · Express 5.2 · Node.js 22"
---

# Tiempo real con WebSockets y Socket.io

Con HTTP, el cliente siempre inicia la conversación: pregunta y el servidor responde. Para un chat, un panel con datos en vivo o un juego, el **servidor también necesita enviar datos por iniciativa propia**. Los **WebSockets** lo permiten.

## HTTP frente a WebSockets

| Aspecto | HTTP | WebSockets |
|---|---|---|
| Comunicación | Cliente → servidor (petición/respuesta) | **Bidireccional**, en ambos sentidos en cualquier momento |
| Conexión | Nueva por petición (sin estado) | **Persistente**: una conexión que permanece abierta |
| Latencia | Mayor (establecer conexión y cabeceras en cada petición) | Baja |
| Uso de recursos | Más ancho de banda por mensaje | Más eficiente en intercambios frecuentes |
| Casos de uso | Cargar páginas, APIs REST | Chat, notificaciones, juegos en línea, datos en vivo |

**Cómo funciona:** el cliente envía una petición HTTP especial (*handshake*) pidiendo «actualizar» el protocolo a WebSocket. Si el servidor acepta, la conexión permanece abierta y ambos pueden enviar mensajes cuando quieran, sin nuevas peticiones HTTP.

## Socket.io

**Socket.io** es la biblioteca más popular para tiempo real en Node.js. Se apoya en WebSockets y añade: reconexión automática, **salas**, difusión (*broadcast*), confirmaciones y mecanismos de respaldo cuando WebSocket no está disponible.

> **Importante:** Socket.io **no es** un WebSocket «puro»: usa su propio protocolo sobre él. Un cliente Socket.io solo habla con un servidor Socket.io. Si necesitas un WebSocket estándar (para conectar con clientes no Socket.io), usa la biblioteca `ws`.

```bash
npm install express socket.io
```

## Servidor mínimo

Socket.io necesita el **servidor HTTP** de Node.js, así que se crea con `http.createServer(app)` y se pasa a `Server`:

```js
// server.js
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));   // sirve public/index.html

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado:', socket.id);

  socket.on('mensaje', (data) => {
    io.emit('mensaje', data);                 // reenvía a TODOS los clientes conectados
  });

  socket.on('disconnect', (motivo) => {
    console.log('Usuario desconectado:', motivo);
  });
});

server.listen(3000, () => console.log('http://localhost:3000'));
```

Se escuchan eventos con `socket.on('evento', callback)` y se envían con `socket.emit('evento', datos)` (solo a ese cliente) o `io.emit(...)` (a todos). Los nombres de evento son libres; `connection` y `disconnect` están reservados.

## Cliente (navegador)

Socket.io sirve automáticamente su biblioteca cliente en `/socket.io/socket.io.js`. Crea `public/index.html`:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Chat en tiempo real</title>
  </head>
  <body>
    <ul id="mensajes"></ul>
    <form id="formulario">
      <input id="entrada" autocomplete="off" placeholder="Escribe un mensaje" />
      <button>Enviar</button>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();                       // se conecta al mismo origen
      const lista = document.getElementById('mensajes');
      const entrada = document.getElementById('entrada');

      document.getElementById('formulario').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!entrada.value.trim()) return;
        socket.emit('mensaje', entrada.value);
        entrada.value = '';
      });

      socket.on('mensaje', (texto) => {
        const li = document.createElement('li');
        li.textContent = texto;                  // textContent: evita inyectar HTML (XSS)
        lista.appendChild(li);
      });
    </script>
  </body>
</html>
```

Ejecuta `node server.js`, abre `http://localhost:3000` en **dos pestañas** y verás los mensajes aparecer al instante en ambas.

> Recuerda que el HTML debe **servirse** desde Express (con `express.static` o `res.sendFile`); abrirlo como archivo local no conectaría con el servidor.

## Casos de uso

### Chat con salas

Las **salas** agrupan sockets; los mensajes se envían solo a los miembros:

```js
io.on('connection', (socket) => {
  socket.on('unirse', (sala) => {
    socket.join(sala);
    io.to(sala).emit('aviso', `Alguien entró en ${sala}`);
  });

  socket.on('mensaje', ({ sala, texto }) => {
    if (typeof texto !== 'string' || !texto.trim()) return;      // valida lo que llega
    io.to(sala).emit('mensaje', { usuario: socket.id, texto: texto.slice(0, 500) });
  });
});
```

Comprobado: un tercer cliente que no se unió a la sala no recibe los mensajes de esa sala.

### Notificaciones

```js
// servidor: avisar a un usuario concreto (cada usuario se une a una sala con su id)
io.to(`usuario:${usuarioId}`).emit('notificacion', 'Tienes un nuevo mensaje');

// cliente
socket.on('notificacion', (mensaje) => alert(mensaje));
```

### Datos en vivo (streaming)

```js
// Emite un precio actualizado cada segundo a todos los clientes
setInterval(() => {
  io.emit('precioActualizado', { valor: (100 + Math.random() * 10).toFixed(2) });
}, 1000);
```

Útil para cotizaciones, paneles de monitorización, marcadores deportivos, etc.

## Autenticación con JWT

Un socket abierto sin identificar es una puerta abierta. Reutiliza el JWT de tu API: el cliente lo envía en el *handshake* y un middleware de Socket.io lo verifica antes de aceptar la conexión.

```js
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token no proporcionado'));
  try {
    socket.data.usuario = jwt.verify(token, process.env.JWT_SECRET);   // { id, rol, … }
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});
```

```js
// cliente
const socket = io({ auth: { token: localStorage.getItem('token') } });
socket.on('connect_error', (err) => console.error(err.message));
```

Los datos del usuario quedan en `socket.data.usuario` para el resto de los manejadores.

## Buenas prácticas

- **Valida cualquier dato** que llegue por un evento, igual que en una ruta HTTP (tipo, longitud, permisos).
- **Autoriza por sala/evento**: comprobar que el usuario puede unirse a esa sala.
- **CORS**: si el cliente está en otro origen, configura `new Server(server, { cors: { origin: [...] } })`.
- **Varias instancias**: necesitas *sticky sessions* en el balanceador y un adaptador compartido (por ejemplo Redis) para que `io.emit` alcance a clientes conectados a otras instancias. Detrás de NGINX, añade las cabeceras `Upgrade`/`Connection` ([ver Escalado](../06-despliegue-y-escalabilidad/04-escalado-cluster-nginx-pm2.md)).
- **Limita** la frecuencia de mensajes por socket para evitar abusos.

## Puntos clave

- WebSockets = conexión persistente y bidireccional; ideal para chat, notificaciones y datos en vivo.
- Socket.io: `io.on('connection')`, `socket.on`/`emit`, `io.emit`, `socket.join` / `io.to(sala)`.
- Crea el servidor con `http.createServer(app)` y sirve el cliente por Express.
- Autentica con JWT en el handshake y valida cada mensaje.

**Siguiente sección:** [Proyecto: API de gestión de tareas](../08-proyecto-api-tareas/01-diseno-y-planificacion.md)
