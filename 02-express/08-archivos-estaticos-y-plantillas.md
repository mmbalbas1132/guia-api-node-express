---
title: "Archivos estáticos y plantillas"
description: "Servir imágenes, CSS y JavaScript con express.static y nociones sobre motores de plantillas."
section: express
order: 8
level: basico
tags: [static, express-static, plantillas, public, sendfile]
prerequisites: [07-validacion-con-express-validator]
tested_on: "Express 5.2 · Node.js 22"
---

# Archivos estáticos y plantillas

## `express.static`

Para servir imágenes, hojas de estilo, scripts del navegador o HTML estático, usa el middleware integrado `express.static(root, [opciones])`, donde `root` es la carpeta que contiene los archivos.

```js
const path = require('node:path');

app.use(express.static(path.join(__dirname, 'public')));
```

Con una carpeta `public/` así:

```text
public/
├── index.html
├── css/style.css
├── js/app.js
└── images/logo.png
```

quedan disponibles:

```text
http://localhost:3000/index.html
http://localhost:3000/css/style.css
http://localhost:3000/images/logo.png
```

> El nombre de la carpeta estática **no forma parte de la URL**: Express busca los archivos relativos a ella.

### Varias carpetas y prefijos virtuales

```js
app.use(express.static('public'));
app.use(express.static('files'));           // se busca en el orden en que se registran

app.use('/static', express.static('public'));   // ahora la URL es /static/css/style.css
```

### Usa rutas absolutas

La ruta que pasas a `express.static` es relativa al directorio **desde el que lanzas `node`**. Si ejecutas la aplicación desde otra carpeta, se rompe. Es más seguro construir una ruta absoluta con `path.join(__dirname, 'public')`.

### Archivos que empiezan por punto (Express 5)

En Express 5, `express.static` **ignora por defecto** los archivos y carpetas ocultos (`dotfiles: 'ignore'`), incluidos los directorios como `.well-known`. Si necesitas servirlos (por ejemplo, para la validación de Let's Encrypt), permítelo explícitamente y solo para esa ruta:

```js
app.use('/.well-known', express.static('public/.well-known', { dotfiles: 'allow' }));
app.use(express.static('public'));
```

### Rendimiento

En producción, lo ideal es que un **proxy inverso** (como NGINX) o una CDN sirva los estáticos y los guarde en caché, dejando a Node.js solo la lógica de la API.

## Enviar un fichero concreto

```js
app.get('/informe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'informe.pdf'));   // muestra el archivo
});

app.get('/descargar', (req, res) => {
  res.download(path.join(__dirname, 'public', 'informe.pdf'));   // fuerza la descarga
});
```

`res.sendFile` requiere una ruta absoluta (o la opción `root`). En Express 5 las opciones `hidden` y `from` ya no existen: usa `dotfiles` y `root`.

## Motores de plantillas

Si quieres que el servidor genere HTML dinámico (en lugar de una API JSON), Express admite **motores de plantillas** como Pug, EJS o Handlebars. Se configuran indicando el motor y la carpeta de vistas, y se responde con `res.render`:

```js
app.set('view engine', 'ejs');            // requiere: npm install ejs
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('index', { titulo: 'Mi aplicación' });   // views/index.ejs
});
```

Esta guía se centra en **APIs REST** que devuelven JSON, por lo que no profundiza en las plantillas. En arquitecturas actuales lo habitual es que un frontend independiente (React, Vue, Angular, una web estática…) consuma la API.

## Puntos clave

- `app.use(express.static(path.join(__dirname, 'public')))` sirve archivos estáticos.
- En Express 5, los dotfiles se ignoran por defecto.
- En producción, deja los estáticos a un proxy inverso o CDN.

**Siguiente:** [Novedades de Express 5 y migración desde Express 4](09-express-5-novedades-y-migracion.md)
