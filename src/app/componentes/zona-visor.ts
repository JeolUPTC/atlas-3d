// ZonaVisor — Sesión 44. La barra de botones, el lienzo 3D, el panel del modelo y el estado de la AR.
// Aquí está la frontera entre Angular y Three.js: Angular dibuja los botones y los textos;
// el <div id="visor"> se lo entrega VACÍO al visor, que es dueño de lo que hay dentro (el <canvas>).
// El selector es de ATRIBUTO («section[zonaVisor]»): el componente ES el <section>, sin elemento envoltorio.
import { Component, ElementRef, afterNextRender, inject, viewChild } from "@angular/core";
import { PanelModelo } from "./panel-modelo";
import { VisorService } from "../servicios/visor.service";
import { SensoresService } from "../servicios/sensores.service";
import { CamaraService } from "../servicios/camara.service";
import { ARService } from "../servicios/ar.service";

@Component({
  selector: "section[zonaVisor]",
  imports: [PanelModelo],
  templateUrl: "./zona-visor.html",
  host: { class: "visor-zona" },
})
export class ZonaVisor {
  protected readonly visorSvc = inject(VisorService);
  protected readonly sensores = inject(SensoresService);
  protected readonly camara = inject(CamaraService);
  protected readonly ar = inject(ARService);

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>("contenedor");
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>("video");

  constructor() {
    // El <div id="visor"> existe recién después del primer dibujo: entonces se crea el visor.
    afterNextRender(() => {
      this.camara.registrarVideo(this.video().nativeElement);
      this.visorSvc.montar(this.contenedor().nativeElement);
    });
  }

  protected alAlternarDiagnostico(e: Event): void {
    this.ar.diagAbierto.set((e.target as HTMLDetailsElement).open);
  }
}
