// ZonaDescargas — Sesión 44. Avisos y descarga de fichas para usar sin conexión (Sesión 37).
// El Service Worker (sw.ts) no cambia: sigue mandando mensajes de progreso a todas las ventanas.
import { Component, DestroyRef, effect, inject, signal } from "@angular/core";
import { encolarDescargas } from "../../db";
import { ETIQUETA_SYNC, descargarPendientes } from "../../descargas";
import { estadoAvisos, mostrarAviso, pedirPermisoAvisos } from "../../avisos";
import { CATALOGO } from "../../modelos";
import { ProgresoService } from "../servicios/progreso.service";
import { SwService } from "../servicios/sw.service";

@Component({
  selector: "section[zonaDescargas]",
  templateUrl: "./zona-descargas.html",
  host: { class: "descargas-zona", "aria-labelledby": "titulo-descargas" },
})
export class ZonaDescargas {
  private readonly progresoSvc = inject(ProgresoService);
  private readonly ids = CATALOGO.map((m) => m.id);

  protected readonly permiso = signal(estadoAvisos());
  protected readonly progreso = signal<{ hechos: number; total: number } | null>(null);
  protected readonly mensaje = signal("");
  protected readonly ocupado = signal(false);

  protected textoAvisos(): string {
    const p = this.permiso();
    return p === "granted" ? "Avisos activos."
      : p === "denied" ? "Avisos bloqueados (cámbialo en la configuración del sitio)."
      : p === "no-soportado" ? "Este navegador no soporta notificaciones."
      : "Avisos sin activar.";
  }

  constructor() {
    const sw = inject(SwService);
    // El servicio avisa cuando el precaché quedó completo por primera vez.
    effect(() => {
      if (sw.offlineReady()) this.mensaje.set("✓ La app ya funciona sin conexión.");
    });

    // El SW informa el avance (y el final) a todas las ventanas abiertas.
    const alMensaje = async (e: MessageEvent) => {
      if (e.data?.tipo === "progreso") this.pintarProgreso(e.data.hechos, e.data.total);
      if (e.data?.tipo === "descarga-completa") await this.progresoSvc.recargar();
    };
    navigator.serviceWorker?.addEventListener("message", alMensaje);
    inject(DestroyRef).onDestroy(() => navigator.serviceWorker?.removeEventListener("message", alMensaje));
  }

  private pintarProgreso(hechos: number, total: number): void {
    this.progreso.set({ hechos, total });
    this.mensaje.set(hechos >= total ? `✓ ${hechos} de ${total} fichas guardadas: ya puedes consultarlas sin conexión.` : `Descargando… ${hechos} de ${total} fichas.`);
  }

  protected async activarAvisos(): Promise<void> {
    // El permiso se pide AQUÍ, dentro del clic.
    const nuevo = await pedirPermisoAvisos();
    if (nuevo === "granted") await mostrarAviso("Avisos activados", "Te avisaremos cuando las fichas estén listas.");
    this.permiso.set(estadoAvisos());
  }

  protected async descargar(): Promise<void> {
    const db = await this.progresoSvc.dbPromesa;
    await encolarDescargas(db, this.ids);
    this.pintarProgreso(0, this.ids.length);
    this.ocupado.set(true);
    try {
      let enSegundoPlano = false;
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register(ETIQUETA_SYNC);
          enSegundoPlano = true;
          this.mensaje.set("Descarga solicitada: el navegador la completará en cuanto haya conexión.");
        } catch {
          // Tener SyncManager no basta: register() falla (NotAllowedError) si el
          // usuario bloqueó la sincronización en segundo plano para este sitio.
          enSegundoPlano = false;
        }
      }
      if (!enSegundoPlano) {
        // Plan B (Safari, Firefox, o permiso denegado): se descarga desde la página, con la pestaña abierta.
        await descargarPendientes(db, (hechos, total) => this.pintarProgreso(hechos, total));
        await this.progresoSvc.recargar();
      }
    } catch (err) {
      this.mensaje.set("No se pudo completar la descarga: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      this.ocupado.set(false);
    }
  }
}
