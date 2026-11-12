// tipos.ts — cómo se DESCRIBE un modelo de arquitectura (Sesión 40).
// Un modelo no es un archivo 3D: es una lista de piezas y de enlaces entre
// ellas. Un constructor genérico (constructor.ts) convierte esa descripción
// en objetos de Three.js. Así, agregar un patrón nuevo es escribir datos,
// no geometría.
export const ROLES = {
    actor: { nombre: "Usuario o sistema externo", color: 0xc9d1e3, css: "#c9d1e3" },
    presentacion: { nombre: "Presentación", color: 0x4aa3ff, css: "#4aa3ff" },
    coordinacion: { nombre: "Coordinación", color: 0xff7a59, css: "#ff7a59" },
    logica: { nombre: "Lógica de negocio", color: 0xffc53d, css: "#ffc53d" },
    datos: { nombre: "Datos", color: 0x4cd1a0, css: "#4cd1a0" },
    infra: { nombre: "Infraestructura", color: 0xb48cff, css: "#b48cff" },
};
export const COLOR_ENLACE = {
    llamada: 0xe8eefc,
    evento: 0xff9ff3,
    datos: 0x8fe3c0,
};
