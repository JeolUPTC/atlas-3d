// microservicios.ts — Microservicios como DATOS (Sesión 40).
import type { DefinicionModelo } from "./tipos";

export const MICROSERVICIOS: DefinicionModelo = {
  id: "microservicios",
  nombre: "Microservicios",
  resumen: "Servicios pequeños e independientes, cada uno con sus datos, detrás de una puerta de entrada.",
  elevacion: 40,
  distancia: 0.8,
  piezas: [
    { id: "cliente", nombre: "Cliente", rol: "actor", forma: "esfera", pos: [0, 0, 8.2], tam: [1.2, 1.2, 1.2], rotulo: "abajo", resumen: "App o navegador que hace las peticiones." },
    { id: "gateway", nombre: "API Gateway", rol: "coordinacion", forma: "caja", pos: [0, 0, 5], tam: [14.4, 0.9, 1.1], rotulo: "frente", resumen: "Puerta de entrada única: recibe la petición y la reparte al servicio que corresponde." },
    { id: "usuarios", nombre: "Usuarios", rol: "logica", forma: "caja", pos: [-7, 0, 0.8], tam: [2.4, 1.2, 1.6], rotulo: "frente", resumen: "Servicio que registra y autentica personas. Es dueño exclusivo de sus datos." },
    { id: "pedidos", nombre: "Pedidos", rol: "logica", forma: "caja", pos: [-2.6, 0, 0.8], tam: [2.4, 1.2, 1.6], rotulo: "frente", resumen: "Servicio que crea y sigue pedidos. Avisa con un evento cuando se crea uno." },
    { id: "broker", nombre: "Bus de mensajes", rol: "infra", forma: "caja", pos: [2.2, 0, 0.8], tam: [3.2, 1.2, 1.6], rotulo: "frente", resumen: "Reparte eventos entre servicios sin que se llamen unos a otros." },
    { id: "pagos", nombre: "Pagos", rol: "logica", forma: "caja", pos: [7, 0, 0.8], tam: [2.4, 1.2, 1.6], rotulo: "frente", resumen: "Servicio que cobra. Reacciona a los eventos de Pedidos sin que Pedidos lo llame directamente." },
    { id: "bd-usuarios", nombre: "BD Usuarios", rol: "datos", forma: "cilindro", pos: [-7, 0, -3.2], tam: [2.4, 1, 2.4], rotulo: "frente", resumen: "Los datos de Usuarios. Solo ese servicio puede tocarlos." },
    { id: "bd-pedidos", nombre: "BD Pedidos", rol: "datos", forma: "cilindro", pos: [-2.6, 0, -3.2], tam: [2.4, 1, 2.4], rotulo: "frente", resumen: "Los datos de Pedidos. Solo ese servicio puede tocarlos." },
    { id: "bd-pagos", nombre: "BD Pagos", rol: "datos", forma: "cilindro", pos: [7, 0, -3.2], tam: [2.4, 1, 2.4], rotulo: "frente", resumen: "Los datos de Pagos. Solo ese servicio puede tocarlos." },
  ],
  enlaces: [
    { de: "cliente", a: "gateway", tipo: "llamada" },
    { de: "gateway", a: "usuarios", tipo: "llamada" },
    { de: "gateway", a: "pedidos", tipo: "llamada" },
    { de: "gateway", a: "pagos", tipo: "llamada" },
    { de: "usuarios", a: "bd-usuarios", tipo: "datos" },
    { de: "pedidos", a: "bd-pedidos", tipo: "datos" },
    { de: "pagos", a: "bd-pagos", tipo: "datos" },
    { de: "pedidos", a: "broker", etiqueta: "publica", tipo: "evento" },
    { de: "broker", a: "pagos", etiqueta: "entrega", tipo: "evento" },
  ],
};
