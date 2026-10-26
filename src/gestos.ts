// gestos.ts — gestos con los dedos sobre un elemento (Sesión 39).
// Un dedo que se arrastra  → mover.
// Dos dedos que se acercan o alejan → escalar (factor).
// Dos dedos que giran → girar (radianes).
// Usa Pointer Events, así que funciona igual con dedo, lápiz o ratón.

export interface AccionesGestos {
  /** Un dedo arrastra. `primero` es true en el primer movimiento de cada arrastre. */
  alMover(x: number, y: number, primero: boolean): void;
  /** Giro de los dos dedos desde el evento anterior, en radianes. */
  alGirar(radianes: number): void;
  /** Cambio de separación entre los dos dedos: 1.1 = 10 % más separados. */
  alEscalar(factor: number): void;
}

export interface Gestos {
  /**
   * true si el toque actual ya se convirtió en gesto (arrastre o dos dedos).
   * Sirve para NO tratar ese toque también como un «tocar para colocar».
   * Se reinicia al apoyar el primer dedo.
   */
  huboGesto(): boolean;
  destruir(): void;
}

const UMBRAL_ARRASTRE_PX = 10; // por debajo de esto es un toque, no un arrastre

export function crearGestos(el: HTMLElement, acciones: AccionesGestos): Gestos {
  const dedos = new Map<number, { x: number; y: number }>();
  let inicio = { x: 0, y: 0 };
  let arrastrando = false;
  let hubo = false;
  let distanciaPrev = 0;
  let anguloPrev = 0;

  const medida = () => {
    const [a, b] = [...dedos.values()];
    return { distancia: Math.hypot(b.x - a.x, b.y - a.y), angulo: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  function alBajar(e: PointerEvent) {
    // Los botones del overlay (como «Salir de AR») no inician gestos.
    if ((e.target as HTMLElement).closest("button")) return;
    if (dedos.size === 0) {
      hubo = false;
      arrastrando = false;
      inicio = { x: e.clientX, y: e.clientY };
    }
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2) {
      const m = medida();
      distanciaPrev = m.distancia;
      anguloPrev = m.angulo;
      hubo = true; // con dos dedos nunca es un toque
    }
  }

  function alMoverDedo(e: PointerEvent) {
    const dedo = dedos.get(e.pointerId);
    if (!dedo) return;
    dedo.x = e.clientX;
    dedo.y = e.clientY;
    if (dedos.size === 1) {
      if (!arrastrando && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < UMBRAL_ARRASTRE_PX) return;
      const primero = !arrastrando;
      arrastrando = true;
      hubo = true;
      acciones.alMover(e.clientX, e.clientY, primero);
    } else if (dedos.size === 2) {
      const m = medida();
      if (distanciaPrev > 0) acciones.alEscalar(m.distancia / distanciaPrev);
      let d = m.angulo - anguloPrev;
      if (d > Math.PI) d -= 2 * Math.PI; // el ángulo da la vuelta en ±180°: se normaliza
      if (d < -Math.PI) d += 2 * Math.PI;
      acciones.alGirar(d);
      distanciaPrev = m.distancia;
      anguloPrev = m.angulo;
    }
  }

  function alSubir(e: PointerEvent) {
    dedos.delete(e.pointerId);
    if (dedos.size === 0) arrastrando = false;
  }

  el.addEventListener("pointerdown", alBajar);
  el.addEventListener("pointermove", alMoverDedo);
  el.addEventListener("pointerup", alSubir);
  el.addEventListener("pointercancel", alSubir);
  return {
    huboGesto: () => hubo,
    destruir() {
      el.removeEventListener("pointerdown", alBajar);
      el.removeEventListener("pointermove", alMoverDedo);
      el.removeEventListener("pointerup", alSubir);
      el.removeEventListener("pointercancel", alSubir);
      dedos.clear();
    },
  };
}
