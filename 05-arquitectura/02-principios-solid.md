---
title: "Principios SOLID"
description: "Los cinco principios SOLID de diseño orientado a objetos explicados con ejemplos en JavaScript para código backend."
section: arquitectura
order: 2
level: intermedio
tags: [solid, diseno, srp, ocp, lsp, isp, dip]
prerequisites: [01-monolito-vs-microservicios]
tested_on: "Node.js 22"
---

# Principios SOLID

SOLID es un conjunto de cinco principios de diseño que ayudan a escribir código **mantenible, extensible y fácil de probar**. Aunque nacieron en la programación orientada a objetos, se aplican igual en JavaScript y en el diseño de servicios de un backend.

## S — Responsabilidad única (*Single Responsibility*)

> Un módulo o clase debe tener **una sola razón para cambiar**.

Una clase que valida, guarda en la base de datos y envía correos cambiará por tres motivos distintos. Sepárala:

```js
class ValidacionUsuario {
  validar({ nombre, email }) {
    if (!nombre) throw new Error('Nombre obligatorio');
    if (!email?.includes('@')) throw new Error('Email no válido');
  }
}

class UsuarioRepository {
  constructor() { this.datos = []; }
  guardar(usuario) { this.datos.push(usuario); return usuario; }
}

class CorreoService {
  enviarBienvenida(usuario) { return `Correo enviado a ${usuario.email}`; }
}
```

En Express, esto se refleja separando **rutas**, **controladores**, **servicios** y **acceso a datos**.

## O — Abierto/cerrado (*Open/Closed*)

> Abierto a la **extensión**, cerrado a la **modificación**.

Evita cadenas de `if/else` que hay que editar cada vez que aparece un caso nuevo. Define una base y extiéndela:

```js
class Pago {
  procesar(monto) { throw new Error('No implementado'); }
}
class PagoTarjeta extends Pago { procesar(m) { return `Tarjeta: ${m}€`; } }
class PagoPayPal extends Pago { procesar(m) { return `PayPal: ${m}€`; } }

// Añadir un método de pago nuevo = una clase nueva, sin tocar `cobrar`
class PagoTransferencia extends Pago { procesar(m) { return `Transferencia: ${m}€`; } }

const cobrar = (metodo, monto) => metodo.procesar(monto);
cobrar(new PagoTransferencia(), 50);
```

## L — Sustitución de Liskov (*Liskov Substitution*)

> Las subclases deben poder **sustituir** a su clase base sin alterar el comportamiento esperado.

Si `Animal` promete `hacerSonido()` pero `Pez` no puede cumplirlo (lanza un error), la jerarquía está mal diseñada. Una solución es separar la capacidad y **componerla** solo donde exista:

```js
const conSonido = (base) => ({ ...base, hacerSonido() { return base.sonido; } });

const perro = conSonido({ nombre: 'Rex', sonido: 'Guau' });
const pez = { nombre: 'Nemo' };            // no promete un sonido que no puede dar

perro.hacerSonido();                       // 'Guau'
```

## I — Segregación de interfaces (*Interface Segregation*)

> Es mejor tener **contratos pequeños y específicos** que uno grande y genérico; nadie debe depender de métodos que no usa.

JavaScript no tiene interfaces formales, pero el principio se aplica igualmente: en lugar de un objeto «Trabajador» con `programar()`, `limpiar()`, `conducir()`, define capacidades pequeñas (`Programador`, `Conductor`) y combina las necesarias. En TypeScript, esto se expresa con interfaces pequeñas.

## D — Inversión de dependencias (*Dependency Inversion*)

> Los módulos de alto nivel **no deben depender de los de bajo nivel**; ambos deben depender de **abstracciones**.

El servicio no debería crear por sí mismo el repositorio o el servicio de correo: los **recibe** (inyección de dependencias). Así puedes sustituirlos (por ejemplo, por versiones falsas en las pruebas):

```js
class UsuarioService {
  constructor(repositorio, validacion, correo) {     // dependencias inyectadas
    this.repositorio = repositorio;
    this.validacion = validacion;
    this.correo = correo;
  }

  registrar(datos) {
    this.validacion.validar(datos);
    const usuario = this.repositorio.guardar(datos);
    return this.correo.enviarBienvenida(usuario);
  }
}

// Producción
const servicio = new UsuarioService(new UsuarioRepository(), new ValidacionUsuario(), new CorreoService());

// Pruebas: un correo falso que solo anota lo que "envía"
class CorreoFake {
  constructor() { this.enviados = []; }
  enviarBienvenida(u) { this.enviados.push(u.email); return 'ok'; }
}
```

## Cómo aplicarlo con criterio

- SOLID son **guías**, no leyes. Aplicarlo de forma dogmática a un proyecto pequeño añade abstracciones inútiles.
- Empieza simple y refactoriza cuando aparezca dolor real (cambios que rompen cosas inesperadas, código imposible de probar).
- La mayor ganancia práctica suele venir de **S** (separar responsabilidades) y **D** (inyectar dependencias).

## Puntos clave

- **S**: una razón para cambiar. **O**: extender sin modificar. **L**: subclases sustituibles. **I**: contratos pequeños. **D**: depender de abstracciones inyectadas.
- Facilitan las pruebas y la evolución del código.

**Siguiente:** [MVC y arquitectura por capas](03-patron-mvc-y-capas.md)
