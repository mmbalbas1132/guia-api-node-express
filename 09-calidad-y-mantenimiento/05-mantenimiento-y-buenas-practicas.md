---
title: "Mantenimiento y buenas prácticas"
description: "Mantener una API en el tiempo: dependencias y auditoría, versiones de Node.js, integración continua, convenciones de código, observabilidad y una lista de revisión."
section: calidad
order: 5
level: intermedio
tags: [mantenimiento, npm-audit, dependencias, ci-cd, github-actions, buenas-practicas, observabilidad]
prerequisites: [03-pruebas-automatizadas, 06-buenas-practicas-seguridad-node]
tested_on: "npm 10/11 (npm outdated, npm audit, npm ls comprobados sobre el proyecto de ejemplo) · Node.js 22/24"
---

# Mantenimiento y buenas prácticas

Publicar la API no es el final: **el software se mantiene** durante años. Las dependencias envejecen, aparecen vulnerabilidades, Node.js publica versiones nuevas y el equipo cambia. Esta página reúne los hábitos que mantienen una aplicación sana.

## 1. Gestión de dependencias

Cada dependencia es código de terceros que ejecutas con los permisos de tu aplicación. Mantenerlas al día es una tarea recurrente.

### Comandos esenciales

```bash
npm outdated          # qué paquetes tienen una versión más nueva (actual / deseada / última)
npm audit             # busca vulnerabilidades conocidas en tus dependencias
npm audit fix         # aplica actualizaciones seguras que las corrigen
npm update            # actualiza dentro de los rangos permitidos por package.json
npm ls --depth=0      # lista las dependencias directas instaladas
npm ci                # instalación limpia y reproducible desde package-lock.json
```

En el proyecto de ejemplo, `npm audit` informa `found 0 vulnerabilities` y `npm outdated` no lista nada pendiente (a fecha de la redacción).

### Versionado semántico

Las versiones siguen `MAYOR.MENOR.PARCHE` (ver [npm y package.json](../01-fundamentos/03-npm-y-package-json.md)):

- **Parche** (`5.2.0 → 5.2.1`): correcciones sin romper nada.
- **Menor** (`5.1 → 5.2`): funcionalidades nuevas compatibles.
- **Mayor** (`4 → 5`): **cambios incompatibles**; hay que leer la guía de migración.

El `^` de `package.json` acepta parches y versiones menores automáticamente, pero **no** las mayores. Estas hay que subirlas a propósito (por ejemplo, la migración de Express 4 a 5 está en [Express 5: novedades y migración](../02-express/09-express-5-novedades-y-migracion.md)).

### Reglas prácticas

- **Versiona `package-lock.json`** e instala en CI y producción con `npm ci`.
- **Revisa las dependencias nuevas** antes de añadirlas: ¿se mantiene?, ¿cuántos mantenedores?, ¿cuántas dependencias arrastra?, ¿la necesitas realmente? Cuantas menos, menor superficie de ataque.
- **Actualiza con frecuencia y en pasos pequeños**: subir un parche cada semana es trivial; saltar tres versiones mayores de golpe es un proyecto.
- **Ejecuta las pruebas** tras cada actualización (por eso importa tenerlas).
- **`npm audit` en CI** y aviso automático de dependencias (por ejemplo, Dependabot en GitHub o Renovate) para recibir *pull requests* de actualización.
- Las guías de seguridad de Node.js recomiendan además cuidar la **cadena de suministro**: fijar versiones con *lockfile*, `npm ci`, valorar `--ignore-scripts` para impedir que los paquetes ejecuten scripts de instalación, y auditar en CI. Ver [Buenas prácticas de seguridad](../03-seguridad/06-buenas-practicas-seguridad-node.md).

### Avisos de deprecación

Cuando Node.js o una librería van a retirar una función, avisan antes con un *deprecation warning*. **No los ignores**: son el aviso previo a que el código deje de funcionar. Para ver de dónde vienen:

```bash
node --trace-deprecation src/server.js
```

Ejemplo real: `new Buffer(1)` produce `DeprecationWarning: Buffer() is deprecated…` (usa `Buffer.alloc`, `Buffer.from`).

## 2. Versiones de Node.js

- Ejecuta siempre una versión **LTS** (*Long Term Support*) que siga recibiendo correcciones de seguridad. No todas las versiones mayores llegan a ser LTS ni duran lo mismo: **comprueba en el calendario oficial cuál es la LTS activa** antes de elegir.
- Una versión que llega al **fin de su soporte** ya no recibe parches de seguridad: hay que migrar antes. Por eso muchos ejemplos antiguos con `node:18-alpine` son un mal punto de partida hoy.
- Declara la versión requerida en `package.json` (`"engines": { "node": ">=20" }`) y fíjala en el entorno (imagen Docker con etiqueta concreta, `.nvmrc` para el equipo).
- Al subir de versión mayor, ejecuta las pruebas y revisa los avisos de deprecación.

## 3. Integración continua (CI)

Automatiza en cada *push* y *pull request*: instalar, probar y auditar. Ejemplo para GitHub Actions (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [22, 24]          # prueba en las versiones LTS que soportas
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm audit --audit-level=high
```

> **Nota:** las versiones de las acciones (`@v4`) cambian con el tiempo; consulta su documentación para usar la vigente. Este ejemplo es una plantilla: el flujo de trabajo no se ejecutó en un repositorio real, aunque `npm ci`, `npm test` y `npm audit` sí se comprobaron con el proyecto de ejemplo.

Las pruebas del proyecto usan MongoDB **en memoria**, por lo que el CI no necesita un servicio de base de datos. Si tus pruebas de integración usaran una base real, la mayoría de plataformas de CI permiten declarar servicios auxiliares.

Para el despliegue continuo (CD), añade un paso final que construya la imagen Docker y la publique o despliegue **solo si todo lo anterior pasó**. Ver [Plataformas de despliegue](../06-despliegue-y-escalabilidad/02-plataformas-de-despliegue.md).

## 4. Calidad y consistencia del código

- **Linter** (ESLint): detecta errores y malas prácticas antes de ejecutar. **Formateador** (Prettier u otro): elimina discusiones de estilo. Ambos se ejecutan en el editor y en CI.
- **Un solo estilo de módulos** (CommonJS o ESM) en todo el proyecto. Ver [Módulos](../01-fundamentos/04-modulos-commonjs-esm.md).
- **Nombres claros** y funciones pequeñas con una responsabilidad ([SOLID](../05-arquitectura/02-principios-solid.md)).
- **Revisión de código** (*code review*) obligatoria antes de fusionar: encuentra errores y reparte el conocimiento.
- **Git con historial útil:** commits pequeños y descriptivos, ramas por funcionalidad, `main` siempre desplegable.
- **Sin secretos en el repositorio** (`.env` en `.gitignore`; si se filtra uno, **rótalo**: borrarlo del historial no basta).
- **Documenta lo que el código no dice:** un `README` con cómo instalar, configurar, probar y desplegar; las decisiones importantes y su porqué; la API con Swagger ([Swagger](01-documentacion-con-swagger.md)).

## 5. Observabilidad en producción

Cuando algo falla a las 3 de la madrugada, necesitas poder averiguar qué pasó **sin reproducirlo**.

| Pilar | Qué es | En este proyecto |
|---|---|---|
| **Logs** | Registro de eventos y errores | Winston en JSON ([Logging](02-logging-con-winston.md)) |
| **Métricas** | Números en el tiempo: peticiones/s, latencia, errores, CPU, memoria | Herramientas como Prometheus + Grafana, o las del proveedor cloud |
| **Trazas** | Recorrido de una petición por varios servicios | Necesario sobre todo con microservicios |
| **Comprobaciones de salud** | ¿Está vivo el servicio? | `GET /salud` |

Recomendaciones:

- **`/salud`** para que el balanceador u orquestador sepa si reiniciar la instancia (ver [Preparar para producción](../06-despliegue-y-escalabilidad/01-preparar-para-produccion.md)).
- **Alertas** sobre lo importante: tasa de errores `5xx`, latencia alta, servicio caído, disco casi lleno. Una alerta que nadie mira no sirve, y demasiadas alertas se ignoran.
- **Identificador de petición** en los logs para seguir una petición completa.
- **Copias de seguridad** de la base de datos, **probando** de vez en cuando que se pueden restaurar.
- **Plan de reversión**: poder volver a la versión anterior rápidamente (imágenes Docker versionadas, despliegues reversibles).

## 6. Lista de revisión antes de cada versión

**Código**

- [ ] Las pruebas pasan (`npm test`) y cubren el cambio.
- [ ] Toda entrada externa se valida; los errores se tratan y no filtran detalles internos.
- [ ] Sin `console.log` de depuración ni datos sensibles en los logs.

**Dependencias**

- [ ] `npm audit` sin vulnerabilidades altas o críticas.
- [ ] `package-lock.json` actualizado y versionado.
- [ ] Sin avisos de deprecación nuevos.

**Configuración y entorno**

- [ ] Variables nuevas documentadas en `.env.example` y definidas en el entorno de destino.
- [ ] `NODE_ENV=production`; CORS limitado a los orígenes reales.
- [ ] Migraciones de base de datos revisadas (y reversibles).

**Despliegue**

- [ ] La imagen/artefacto se construye desde cero en CI.
- [ ] `/salud` responde tras el despliegue y hay un plan de reversión.
- [ ] Documentación de la API (Swagger) actualizada.

## Puntos clave

- Mantener es una actividad continua: actualiza dependencias en pasos pequeños, con pruebas y `npm audit`.
- Usa versiones LTS de Node.js y planifica la migración antes del fin de soporte.
- CI en cada cambio: `npm ci`, `npm test`, `npm audit`.
- Observabilidad: logs, métricas, alertas y comprobaciones de salud, con copias de seguridad probadas.

**Siguiente sección:** [Referencias: siguientes pasos](../10-referencias/01-siguientes-pasos.md)
