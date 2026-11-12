// OverlayAR — Sesión 44. Lo que se dibuja encima de la cámara durante la sesión de AR.
// WebXR pide UN elemento HTML como «dom-overlay»: debe existir antes de pedir la sesión y no
// reemplazarse mientras dura. Angular crea este elemento una vez y solo cambia su texto.
import { Component, ElementRef, computed, inject } from "@angular/core";
import { ARService } from "../servicios/ar.service";
import { PanelService } from "../servicios/panel.service";

@Component({
  selector: "div[overlayAr]",
  templateUrl: "./overlay-ar.html",
  host: { id: "xr-overlay", class: "xr-overlay" },
})
export class OverlayAR {
  protected readonly ar = inject(ARService);
  protected readonly panel = inject(PanelService);

  protected readonly textoPieza = computed(() => {
    const pieza = this.panel.pieza();
    const extra = pieza ? this.panel.ficha()?.piezas[pieza.id] : null;
    return pieza ? `${pieza.nombre}: ${extra ? extra.responsabilidad : pieza.resumen}` : `${this.panel.def().nombre}. Usa ◀ ▶ para recorrer sus piezas.`;
  });

  constructor() {
    // El elemento ya existe: se le entrega al servicio, que lo pasará a WebXR como dom-overlay.
    this.ar.registrarOverlay(inject<ElementRef<HTMLElement>>(ElementRef).nativeElement);
  }
}
