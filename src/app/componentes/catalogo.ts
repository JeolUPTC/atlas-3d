// Catalogo — Sesión 44. Las tarjetas con favoritos, «visto» y nota de estudio cifrada (Sesiones 33-34).
// Antes, cada acción terminaba en render(): borrar todo y reescribirlo. Ahora cada tarjeta es un
// componente con su propio estado (la nota que escribes) y Angular cambia solo lo que cambió.
import { Component, afterNextRender, computed, inject, input, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CATALOGO } from "../../modelos";
import { ProgresoService } from "../servicios/progreso.service";
import { PanelService } from "../servicios/panel.service";

interface Modelo { id: string; nombre: string; resumen: string }

@Component({
  selector: "article[tarjeta]",
  imports: [FormsModule],
  templateUrl: "./tarjeta.html",
  host: {
    class: "modelo-card",
    "[class.destacada]": "destacada()",
    "[id]": '"tarjeta-" + modelo().id',
    "[attr.data-id]": "modelo().id",
  },
})
export class Tarjeta {
  readonly modelo = input.required<Modelo>();
  readonly destacada = input(false);

  // Las acciones no se pasan de padre a hijo: la tarjeta pide los servicios que necesita.
  protected readonly progresoSvc = inject(ProgresoService);
  private readonly panel = inject(PanelService);

  protected readonly nota = signal("");
  protected readonly progreso = computed(() => this.progresoSvc.progreso().get(this.modelo().id));
  protected readonly descargado = computed(() => this.progresoSvc.descargados().has(this.modelo().id));
  protected readonly ultimaVisita = computed(() => {
    const v = this.progreso()?.ultimaVisita;
    return v ? new Date(v).toLocaleString() : "nunca";
  });

  constructor() {
    // Una notificación puede abrir la app con ?modelo=ID para destacar esa ficha (Sesión 37).
    afterNextRender(() => {
      if (this.destacada()) document.getElementById(`tarjeta-${this.modelo().id}`)?.scrollIntoView({ block: "center" });
    });
  }

  protected ver3D(): void {
    this.panel.elegirModelo(this.modelo().id);
    document.querySelector("#visor")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  protected async guardar(): Promise<void> {
    if (!this.nota().trim()) return;
    if (await this.progresoSvc.guardarNota(this.modelo().id, this.nota())) this.nota.set("");
  }
}

@Component({
  selector: "div[catalogo]",
  imports: [Tarjeta],
  templateUrl: "./catalogo.html",
  host: { class: "atlas-demo" },
})
export class Catalogo {
  protected readonly modelos: Modelo[] = CATALOGO.map((m) => ({ id: m.id, nombre: m.nombre, resumen: m.resumen }));
  protected readonly destacado = new URLSearchParams(location.search).get("modelo");
}
