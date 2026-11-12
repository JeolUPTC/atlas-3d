// ARService — Sesión 44. La realidad aumentada de las Sesiones 38-42 (xr.ts y visor.ts no cambian):
// ¿se puede?, entrar, el texto del overlay y la salida. Todo lo imperativo (la sesión WebXR, el
// render) sigue en el visor; el servicio solo guarda lo que la pantalla necesita mostrar.
import { DestroyRef, Injectable, computed, inject, signal } from "@angular/core";
import type { EstadoAR } from "../../visor";
import { describirErrorAR, diagnosticarAR, mensajeSoporteAR, pedirSesionAR } from "../../xr";
import { describirRastro, leerRastro, PASO_FINAL } from "../../rastro";
import { VisorService } from "./visor.service";
import { CamaraService } from "./camara.service";
import { SensoresService } from "./sensores.service";

// Texto de ayuda sobre la cámara según en qué punto va la colocación.
function ayudaAR(e: EstadoAR): string {
  if (!e.hitTest) return "Este dispositivo no ofrece hit-test: el modelo está a 1,5 m delante. Toca para traerlo delante de ti.";
  switch (e.fase) {
    case "buscando":
      return e.sinSuperficie
        ? "No encuentro superficies. Prueba con una zona con textura y buena luz, o toca la pantalla para colocar el modelo delante de ti."
        : "Mueve el teléfono despacio hasta ver el anillo verde sobre una superficie.";
    case "listo":
      return "Toca la pantalla para colocar el modelo.";
    case "colocado":
      return e.overlay
        ? "Arrastra para moverlo, gira con dos dedos, pellizca para el tamaño. Toca otro punto para recolocarlo."
        : "Modelo colocado. Toca otro punto para recolocarlo.";
  }
}

function datosAR(e: EstadoAR): string {
  const si = (v: boolean) => (v ? "sí" : "no");
  const { x, y, z } = e.posicion;
  const pos = e.fase === "colocado" ? `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) m` : "—";
  return (
    `hit-test: ${si(e.hitTest)} · anclas: ${si(e.anclas)} · anclado: ${si(e.anclado)} · ` +
    `fase: ${e.fase} · escala: ${e.escala.toFixed(2)} · giro: ${e.giroGrados}° · pos: ${pos} · ` +
    `consultas: ${e.consultas} · resultados: ${e.resultados} · poses: ${e.impactos}`
  );
}

// Cada cambio del texto del overlay obliga al navegador a volver a dibujarlo encima de la cámara,
// y eso cuesta. Por eso: (1) solo se actualiza si el texto cambió y (2) como máximo cada 200 ms
// (los gestos avisan decenas de veces por segundo). En Angular, (1) lo hace la opción `equal` de la señal.
const INTERVALO_OVERLAY_MS = 200;

interface TextosOverlay { ayuda: string; datos: string }

@Injectable({ providedIn: "root" })
export class ARService {
  private readonly visorSvc = inject(VisorService);
  private readonly camara = inject(CamaraService);
  private readonly sensores = inject(SensoresService);

  private sesion: XRSession | null = null;
  private overlay: HTMLElement | null = null;

  private readonly disponible = signal(false);
  readonly enSesion = signal(false);
  readonly puedeEntrar = computed(() => this.disponible() && !this.enSesion());
  readonly estado = signal("Comprobando realidad aumentada…");
  readonly diagnostico = signal("");
  readonly diagAbierto = signal(false);
  readonly textos = signal<TextosOverlay>(
    { ayuda: "Sesión de realidad aumentada activa", datos: "" },
    // Mismo texto: la señal no avisa y Angular no vuelve a dibujar nada.
    { equal: (a, b) => a.ayuda === b.ayuda && a.datos === b.datos }
  );

  // Throttle del overlay.
  private ultimoPintado = 0;
  private pendiente: EstadoAR | null = null;
  private temporizador = 0;

  constructor() {
    // ¿Se puede? El botón solo se habilita si la respuesta es «sí». Se pregunta al cargar, al pulsar
    // «Comprobar de nuevo» y cuando el navegador avisa de que cambió el dispositivo XR.
    void this.comprobar();
    const alCambiar = () => void this.comprobar();
    navigator.xr?.addEventListener("devicechange", alCambiar);
    inject(DestroyRef).onDestroy(() => {
      navigator.xr?.removeEventListener("devicechange", alCambiar);
      window.clearTimeout(this.temporizador);
    });
  }

  registrarOverlay(el: HTMLElement): void {
    this.overlay = el;
  }

  async comprobar(): Promise<void> {
    const { estado: soporte, lineas } = await diagnosticarAR();
    this.estado.set(mensajeSoporteAR(soporte));
    this.diagnostico.set([...lineas, this.sesion ? "Sesión de AR en curso." : describirRastro()].join("\n"));
    if (!this.sesion) this.disponible.set(soporte === "disponible");
    const rastro = leerRastro();
    // Si no se puede, el diagnóstico se muestra abierto para ver qué comprobación falló.
    this.diagAbierto.set(soporte !== "disponible" || (!this.sesion && rastro !== null && rastro.paso !== PASO_FINAL));
  }

  private pintar(e: EstadoAR): void {
    this.textos.set({ ayuda: ayudaAR(e), datos: datosAR(e) });
  }

  private mostrar = (e: EstadoAR): void => {
    if (performance.now() - this.ultimoPintado >= INTERVALO_OVERLAY_MS) {
      this.ultimoPintado = performance.now();
      this.pintar(e);
      return;
    }
    this.pendiente = e; // se pintará el último estado cuando venza el intervalo
    if (this.temporizador) return;
    this.temporizador = window.setTimeout(() => {
      this.temporizador = 0;
      this.ultimoPintado = performance.now();
      if (this.pendiente) this.pintar(this.pendiente);
      this.pendiente = null;
    }, INTERVALO_OVERLAY_MS);
  };

  async entrar(): Promise<void> {
    const visor = this.visorSvc.visor();
    if (!visor) return;
    this.visorSvc.aviso.set("");
    // La cámara del navegador y la sesión AR no pueden usarse a la vez; tampoco los sensores.
    this.camara.apagar();
    this.sensores.apagar();
    try {
      // La petición ocurre DENTRO del clic: es el «gesto del usuario» que exige WebXR.
      const nueva = await pedirSesionAR(this.overlay);
      this.sesion = nueva;
      this.enSesion.set(true);
      const concedido = await visor.entrarEnAR(nueva, {
        overlay: this.overlay!,
        alCambiar: this.mostrar,
        alTerminar: () => {
          this.sesion = null;
          this.enSesion.set(false);
          this.estado.set("La sesión de realidad aumentada terminó.");
        },
      });
      // Alguna función puede haberse pedido como opcional; aquí se ve cuáles se concedieron de verdad.
      const faltan = [!concedido.overlay && "dom-overlay", !concedido.hitTest && "hit-test", !concedido.anclas && "anchors"].filter(Boolean);
      this.estado.set(
        faltan.length
          ? `Sesión de realidad aumentada activa. El navegador no concedió: ${faltan.join(", ")}.`
          : "Sesión de realidad aumentada activa con hit-test, anclas y botones sobre la cámara."
      );
    } catch (err) {
      this.sesion?.end().catch(() => {});
      this.sesion = null;
      this.enSesion.set(false);
      this.visorSvc.aviso.set(describirErrorAR(err));
    }
  }

  salir(): void {
    void this.sesion?.end();
  }
}
