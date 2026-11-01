// rastro.ts — migas de pan para diagnosticar cierres de la pestaña (Sesión 40).
// Si Chrome cierra la pestaña («¡Oh, no!») no hay consola que mirar. Antes de cada paso
// delicado de la salida de AR se anota su nombre en localStorage (una escritura síncrona
// llega al disco aunque la pestaña muera justo después). Al volver a abrir la app se
// lee la última anotación: dice hasta dónde se llegó.
const CLAVE = "atlas3d-rastro-ar";
export const PASO_FINAL = "fin-ok";

export function anotar(paso: string): void {
  try {
    localStorage.setItem(CLAVE, `${paso}|${Date.now()}`);
  } catch {
    /* sin almacenamiento (modo privado): el rastro es opcional */
  }
}

export function leerRastro(): { paso: string; hace: number } | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const [paso, t] = crudo.split("|");
    return { paso, hace: Math.round((Date.now() - Number(t)) / 1000) };
  } catch {
    return null;
  }
}

/** Texto para el diagnóstico: vacío si todo terminó bien o nunca se usó AR. */
export function describirRastro(): string {
  const r = leerRastro();
  if (!r) return "Última sesión de AR: sin registro.";
  if (r.paso === PASO_FINAL) return `Última sesión de AR: terminó completa (hace ${r.hace} s).`;
  return `Última sesión de AR: se interrumpió en el paso «${r.paso}» (hace ${r.hace} s).`;
}
