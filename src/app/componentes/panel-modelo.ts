// PanelModelo — Sesión 44. Pestañas, resumen, leyenda, piezas y detalle del modelo elegido.
// En la Sesión 40 esto eran ~60 líneas de innerHTML, querySelectorAll y addEventListener;
// aquí es una plantilla que lee señales. No hay nada que sincronizar a mano.
import { Component, computed, inject } from "@angular/core";
import { CATALOGO } from "../../modelos";
import { ROLES, type DefinicionModelo } from "../../modelos/tipos";
import { PanelService } from "../servicios/panel.service";

@Component({
  selector: "section[panelModelo]",
  templateUrl: "./panel-modelo.html",
  host: { class: "modelo-panel", "aria-label": "Modelo de arquitectura" },
})
export class PanelModelo {
  protected readonly panel = inject(PanelService);
  protected readonly catalogo = CATALOGO;
  protected readonly ROLES = ROLES;

  protected readonly roles = computed(() => [...new Set(this.panel.def().piezas.map((p) => p.rol))]);
  protected readonly extra = computed(() => {
    const p = this.panel.pieza();
    return p ? this.panel.ficha()?.piezas[p.id] : undefined;
  });

  protected nombresDe(def: DefinicionModelo, ids: string[]): string {
    return ids.map((x) => def.piezas.find((p) => p.id === x)?.nombre ?? x).join(", ");
  }

  protected alElegirPieza(id: string): void {
    this.panel.elegirPieza(this.panel.piezaId() === id ? null : id);
  }
}
