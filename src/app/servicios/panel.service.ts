// PanelService — Sesión 44. Qué modelo y qué pieza están elegidos, y la ficha ampliada del modelo.
// Es el estado que en la Sesión 40 vivía en tres variables sueltas y en seis funciones que reescribían HTML.
import { Injectable, computed, effect, inject, signal, untracked } from "@angular/core";
import { CATALOGO, modeloPorId } from "../../modelos";
import { leerFicha } from "../../descargas";
import type { Ficha } from "../../modelos/tipos";
import { VisorService } from "./visor.service";

@Injectable({ providedIn: "root" })
export class PanelService {
  private readonly visorSvc = inject(VisorService);

  readonly modeloId = signal(CATALOGO[0].id);
  readonly piezaId = signal<string | null>(null);
  private readonly fichaCargada = signal<{ id: string; datos: Ficha | null } | null>(null);

  readonly def = computed(() => modeloPorId(this.modeloId())!);
  readonly pieza = computed(() => this.def().piezas.find((p) => p.id === this.piezaId()));
  readonly ficha = computed(() => {
    const f = this.fichaCargada();
    return f?.id === this.modeloId() ? f.datos : null;
  });

  constructor() {
    // Al llegar el visor: el primer modelo. Y cuando el usuario toca una pieza en la vista 3D, el visor avisa.
    effect(() => {
      const visor = this.visorSvc.visor();
      if (!visor) return;
      untracked(() => {
        this.elegirModelo(CATALOGO[0].id);
        visor.alTocarPieza((id) => this.piezaId.set(id));
      });
    });

    // La ficha ampliada llega de la caché (sin conexión) o de la red; si no hay ninguna, se usa solo el código.
    effect((alLimpiar) => {
      const id = this.modeloId();
      let vigente = true; // si cambias de modelo antes de que llegue, la respuesta vieja se descarta
      alLimpiar(() => (vigente = false));
      void leerFicha(id).then((datos) => {
        if (vigente) this.fichaCargada.set({ id, datos });
      });
    });
  }

  // Un manejador de eventos habla con el visor (imperativo) y actualiza el estado (declarativo).
  elegirModelo(id: string): void {
    const def = modeloPorId(id);
    const visor = this.visorSvc.visor();
    if (!def || !visor) return;
    visor.mostrarModelo(def);
    this.modeloId.set(id);
    this.piezaId.set(null);
  }

  elegirPieza(id: string | null): void {
    this.visorSvc.visor()?.seleccionar(id);
    this.piezaId.set(id);
  }

  /** ◀ ▶ del overlay AR: ninguna → 1.ª → 2.ª … → ninguna. */
  recorrerPiezas(paso: number): void {
    const ids: (string | null)[] = [null, ...this.def().piezas.map((p) => p.id)];
    const i = ids.indexOf(this.piezaId());
    this.elegirPieza(ids[(i + paso + ids.length) % ids.length]);
  }
}
