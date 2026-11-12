// App — Sesión 44. El Atlas 3D, ahora como árbol de componentes de Angular.
// Lo que NO cambió: visor.ts (Three.js y WebXR), xr.ts, sw.ts, db.ts, crypto.ts, los modelos y el manifest.
// Lo que cambió: main.ts (649 líneas de querySelector y addEventListener) se reparte en servicios y componentes.
import { Component, DestroyRef, afterNextRender, inject } from "@angular/core";
import { mostrarAviso } from "../avisos";
import { BASE_URL } from "../base";
import { ConexionService } from "./servicios/conexion.service";
import { InstalacionService } from "./servicios/instalacion.service";
import { SwService } from "./servicios/sw.service";
import { ZonaVisor } from "./componentes/zona-visor";
import { ZonaInstalar } from "./componentes/zona-instalar";
import { ZonaDescargas } from "./componentes/zona-descargas";
import { OverlayAR } from "./componentes/overlay-ar";
import { Catalogo } from "./componentes/catalogo";

@Component({
  selector: "app-root",
  imports: [ZonaVisor, ZonaInstalar, ZonaDescargas, OverlayAR, Catalogo],
  templateUrl: "./app.html",
})
export class App {
  protected readonly conexion = inject(ConexionService);

  constructor() {
    // Pedir el servicio aquí lo crea ahora, ANTES del primer dibujo: el oyente de beforeinstallprompt
    // ya está puesto cuando la página aparece. (En React se ponía en un efecto, después del primer dibujo.)
    inject(InstalacionService);
    const sw = inject(SwService);
    afterNextRender(() => sw.iniciar());

    // appinstalled se dispara cuando el usuario instala la PWA.
    const alInstalar = () => void mostrarAviso("Atlas 3D instalado", "Ya puedes abrirlo desde tu pantalla de inicio.", BASE_URL, "atlas-instalado");
    window.addEventListener("appinstalled", alInstalar);
    inject(DestroyRef).onDestroy(() => window.removeEventListener("appinstalled", alInstalar));
  }
}
