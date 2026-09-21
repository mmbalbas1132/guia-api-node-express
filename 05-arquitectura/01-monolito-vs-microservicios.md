---
title: "Monolito frente a microservicios"
description: "Dos estilos de arquitectura backend: ventajas, inconvenientes y cuándo elegir cada uno."
section: arquitectura
order: 1
level: intermedio
tags: [arquitectura, monolito, microservicios, escalabilidad]
prerequisites: [04-postgresql-sequelize]
tested_on: "Conceptual"
---

# Monolito frente a microservicios

La arquitectura describe cómo se organiza y se comunica el código de un sistema. Los dos extremos más habituales son el **monolito** y los **microservicios**.

## Arquitectura monolítica

Todos los componentes (autenticación, usuarios, pedidos, pagos…) viven **en una sola aplicación**, se despliegan juntos y comparten (normalmente) una sola base de datos.

```text
┌───────────────────────────────────┐
│ Aplicación única (un proceso)     │
│  Autenticación │ Usuarios │ Pagos │
│                                   │
│         Una base de datos         │
└───────────────────────────────────┘
```

**Ventajas**

- Rápido de desarrollar y de desplegar al principio: un solo repositorio y un solo artefacto.
- Sin complejidad de comunicación entre servicios (las llamadas son funciones normales).
- Menor coste operativo: una aplicación que monitorizar.
- Más fácil de probar y depurar de extremo a extremo.

**Inconvenientes**

- Escalar exige **replicar toda la aplicación**, aunque solo una parte sea el cuello de botella.
- Un cambio o un fallo en un módulo puede afectar a todo el sistema.
- A medida que crece, el código se vuelve difícil de mantener si no está bien modularizado.
- Una sola tecnología para todo; equipos grandes se estorban entre sí.

## Arquitectura de microservicios

La aplicación se divide en **servicios pequeños e independientes** (autenticación, catálogo, pagos…), cada uno con su propio código, despliegue y, a menudo, su propia base de datos. Se comunican por **APIs** (HTTP/REST, gRPC) o por **mensajería** asíncrona (colas de eventos).

```text
              ┌────────────┐
   Cliente ─► │ API Gateway│
              └─────┬──────┘
        ┌───────────┼────────────┐
        ▼           ▼            ▼
   [Servicio     [Servicio    [Servicio
    Usuarios]     Catálogo]     Pagos]
      BD 1          BD 2         BD 3
```

**Ventajas**

- **Escalabilidad por servicio**: escalas solo lo que lo necesita.
- Se pueden **actualizar y desplegar de forma independiente**.
- Cada equipo puede elegir la tecnología más adecuada para su servicio.
- El fallo de un servicio no tiene por qué tumbar todo el sistema.

**Inconvenientes**

- **Mayor complejidad**: comunicación de red, latencia, consistencia de datos entre servicios, trazabilidad distribuida.
- Requiere despliegue avanzado: contenedores, orquestación, CI/CD, observabilidad.
- Mayor coste de infraestructura y operación.
- Pruebas de extremo a extremo más difíciles.

## Comparativa

| Aspecto | Monolito | Microservicios |
|---|---|---|
| Tamaño de equipo ideal | Pequeño | Grande, varios equipos |
| Complejidad | Baja | Alta |
| Escalabilidad | Limitada (se escala todo) | Alta (por servicio) |
| Mantenimiento a largo plazo | Difícil si crece sin orden | Modular y flexible |
| Coste inicial | Bajo | Alto |
| Despliegue | Una unidad | Muchas unidades independientes |

## ¿Cuál elegir?

**Consejo práctico: empieza con un monolito bien modularizado y migra a microservicios solo cuando el tamaño del equipo o los cuellos de botella lo justifiquen.** Muchos proyectos adoptan microservicios demasiado pronto y pagan su complejidad sin necesitar sus ventajas.

Un buen punto intermedio es el **monolito modular**: un solo despliegue, pero con módulos claramente separados (autenticación, usuarios, pedidos…) con límites nítidos. Así, extraer un módulo a un servicio propio en el futuro resulta mucho más sencillo. La estructura por capas de la [siguiente página](03-patron-mvc-y-capas.md) va en esa dirección.

## Puntos clave

- Monolito: simple y barato de empezar; se escala replicando todo.
- Microservicios: escalables e independientes, pero costosos de operar.
- Empieza monolítico y modular; divide cuando haya una razón concreta.

**Siguiente:** [Principios SOLID](02-principios-solid.md)
