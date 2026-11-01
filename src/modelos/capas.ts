// capas.ts — Arquitectura en capas como DATOS (Sesión 40).
import type { DefinicionModelo } from "./tipos";

export const CAPAS: DefinicionModelo = {
  id: "capas",
  nombre: "Arquitectura en capas",
  resumen: "Niveles apilados: cada capa solo habla con la inmediatamente inferior.",
  elevacion: 10,
  piezas: [
    { id: "usuario", nombre: "Usuario", rol: "actor", forma: "esfera", pos: [0, 6.3, 0], tam: [1.1, 1.1, 1.1], resumen: "Quien usa la aplicación." },
    { id: "presentacion", nombre: "Presentación", rol: "presentacion", forma: "caja", pos: [0, 4.2, 0], tam: [7, 0.8, 3.2], rotulo: "frente", resumen: "Pantallas y formularios. Muestra datos y recoge acciones." },
    { id: "negocio", nombre: "Lógica de negocio", rol: "logica", forma: "caja", pos: [0, 2.1, 0], tam: [7, 0.8, 3.2], rotulo: "frente", resumen: "Las reglas: validar, calcular, decidir. Aquí vive lo que hace valiosa a la aplicación." },
    { id: "acceso", nombre: "Acceso a datos", rol: "datos", forma: "caja", pos: [0, 0, 0], tam: [7, 0.8, 3.2], rotulo: "frente", resumen: "Traduce la lógica en consultas: lee y escribe sin que las capas de arriba conozcan el almacenamiento." },
    { id: "bd", nombre: "Base de datos", rol: "infra", forma: "cilindro", pos: [0, -2.4, 0], tam: [2.8, 1, 2.8], rotulo: "frente", resumen: "Donde los datos viven de forma permanente." },
  ],
  enlaces: [
    { de: "usuario", a: "presentacion", etiqueta: "usa", tipo: "llamada" },
    { de: "presentacion", a: "negocio", etiqueta: "solicita", tipo: "llamada", desvio: [-2, 0, 0] },
    { de: "negocio", a: "presentacion", etiqueta: "responde", tipo: "datos", desvio: [2, 0, 0] },
    { de: "negocio", a: "acceso", etiqueta: "solicita", tipo: "llamada", desvio: [-2, 0, 0] },
    { de: "acceso", a: "negocio", etiqueta: "responde", tipo: "datos", desvio: [2, 0, 0] },
    { de: "acceso", a: "bd", etiqueta: "consulta", tipo: "llamada" },
  ],
};
