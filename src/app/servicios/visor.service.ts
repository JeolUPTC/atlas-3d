// VisorService — Sesión 44. El visor de Three.js (visor.ts) vive fuera de Angular y es dueño del <canvas>.
// Este servicio solo lo crea cuando el contenedor ya existe en la página, lo guarda en una señal y lo
// destruye cuando Angular destruye la aplicación. Es la frontera entre Angular y Three.js.
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import type { Visor } from "../../visor";

@Injectable({ providedIn: "root" })
export class VisorService {
  readonly visor = signal<Visor | null>(null);
  /** Mensaje de aviso bajo la barra de botones (cámara, sensores, AR). */
  readonly aviso = signal("");

  private destruido = false;

  constructor() {
    // La limpieza: sin ella, el canvas, los oyentes y los recursos de la GPU quedarían vivos.
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.visor()?.destruir();
    });
  }

  async montar(contenedor: HTMLElement): Promise<void> {
    // import() dinámico: el compilador de Angular saca visor.ts y Three.js del archivo principal y los deja
    // en un archivo aparte que se descarga DESPUÉS de dibujar la página (Sesión 42: el mismo remedio, otra técnica).
    const { crearVisor } = await import("../../visor");
    if (this.destruido) return; // la aplicación se destruyó mientras se descargaba el archivo
    this.visor.set(crearVisor(contenedor));
  }
}
