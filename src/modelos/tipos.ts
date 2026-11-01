// tipos.ts — cómo se DESCRIBE un modelo de arquitectura (Sesión 40).
// Un modelo no es un archivo 3D: es una lista de piezas y de enlaces entre
// ellas. Un constructor genérico (constructor.ts) convierte esa descripción
// en objetos de Three.js. Así, agregar un patrón nuevo es escribir datos,
// no geometría.

/** Qué responsabilidad cumple una pieza: decide su color y la leyenda. */
export type Rol = "actor" | "presentacion" | "coordinacion" | "logica" | "datos" | "infra";

export type Forma = "caja" | "cilindro" | "esfera";

export interface Pieza {
  id: string;
  nombre: string;
  rol: Rol;
  forma: Forma;
  /** Centro de la pieza (x derecha, y arriba, z hacia el espectador). */
  pos: [number, number, number];
  /** Ancho, alto y fondo. */
  tam: [number, number, number];
  /** Frase corta: viaja con el código, así se lee aunque no haya conexión. */
  resumen: string;
  /** Dónde va el rótulo: «arriba» de la pieza (por defecto), «abajo», o «frente», sobre su cara delantera. */
  rotulo?: "arriba" | "abajo" | "frente";
}

/** Cómo se comunican dos piezas: una llamada directa, un evento, o un flujo de datos. */
export type TipoEnlace = "llamada" | "evento" | "datos";

export interface Enlace {
  de: string;
  a: string;
  etiqueta?: string;
  tipo: TipoEnlace;
  /** Desplaza la flecha entera, para dibujar dos flechas paralelas entre las mismas piezas. */
  desvio?: [number, number, number];
}

export interface DefinicionModelo {
  id: string;
  nombre: string;
  /** Una línea para la lista de modelos. */
  resumen: string;
  piezas: Pieza[];
  enlaces: Enlace[];
  /** Altura de la cámara de la vista normal, en grados sobre el horizonte (cada modelo se lee mejor desde un ángulo distinto). */
  elevacion?: number;
  /** Factor de la distancia de la cámara (menor = más cerca). Por defecto 1. */
  distancia?: number;
}

/** Ficha ampliada: es el JSON que se descarga para usar sin conexión. */
export interface Ficha {
  id: string;
  nombre: string;
  resumen: string;
  cuando_usarlo: string;
  riesgo: string;
  piezas: Record<string, { responsabilidad: string; habla_con: string[] }>;
}

export const ROLES: Record<Rol, { nombre: string; color: number; css: string }> = {
  actor: { nombre: "Usuario o sistema externo", color: 0xc9d1e3, css: "#c9d1e3" },
  presentacion: { nombre: "Presentación", color: 0x4aa3ff, css: "#4aa3ff" },
  coordinacion: { nombre: "Coordinación", color: 0xff7a59, css: "#ff7a59" },
  logica: { nombre: "Lógica de negocio", color: 0xffc53d, css: "#ffc53d" },
  datos: { nombre: "Datos", color: 0x4cd1a0, css: "#4cd1a0" },
  infra: { nombre: "Infraestructura", color: 0xb48cff, css: "#b48cff" },
};

export const COLOR_ENLACE: Record<TipoEnlace, number> = {
  llamada: 0xe8eefc,
  evento: 0xff9ff3,
  datos: 0x8fe3c0,
};
