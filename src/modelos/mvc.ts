// mvc.ts — Modelo-Vista-Controlador como DATOS (Sesión 40).
import type { DefinicionModelo } from "./tipos";

export const MVC: DefinicionModelo = {
  id: "mvc",
  nombre: "Patrón MVC",
  resumen: "Tres responsabilidades separadas: datos y reglas, pantalla, y quien las coordina.",
  elevacion: 34,
  piezas: [
    { id: "usuario", nombre: "Usuario", rol: "actor", forma: "esfera", pos: [-6.6, 0, 4], tam: [1.1, 1.1, 1.1], rotulo: "abajo", resumen: "Quien toca la pantalla y mira el resultado." },
    { id: "vista", nombre: "Vista", rol: "presentacion", forma: "caja", pos: [-3.8, 0, 1.8], tam: [2.6, 1.2, 1.5], rotulo: "frente", resumen: "Dibuja los datos y capta lo que hace el usuario. No toma decisiones." },
    { id: "controlador", nombre: "Controlador", rol: "coordinacion", forma: "caja", pos: [0, 0, -3.4], tam: [2.8, 1.2, 1.5], rotulo: "frente", resumen: "Recibe las acciones de la vista y decide qué debe hacer el modelo." },
    { id: "modelo", nombre: "Modelo", rol: "datos", forma: "caja", pos: [3.8, 0, 1.8], tam: [2.6, 1.6, 1.5], rotulo: "frente", resumen: "Guarda los datos y aplica las reglas del negocio. No sabe cómo se ven." },
  ],
  enlaces: [
    { de: "usuario", a: "vista", etiqueta: "toca", tipo: "llamada" },
    { de: "vista", a: "controlador", etiqueta: "acción", tipo: "llamada" },
    { de: "controlador", a: "modelo", etiqueta: "actualiza", tipo: "llamada" },
    { de: "modelo", a: "vista", etiqueta: "notifica el cambio", tipo: "evento" },
  ],
};
