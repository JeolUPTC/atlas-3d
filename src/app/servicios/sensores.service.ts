// SensoresService — Sesión 44. Rotar el modelo con la inclinación del teléfono (Sesión 35).
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { hayOrientacionReal, iniciarControlOrientacion, pedirPermisoOrientacion, type ControlOrientacion } from "../../sensores";
import { VisorService } from "./visor.service";

@Injectable({ providedIn: "root" })
export class SensoresService {
  private readonly visorSvc = inject(VisorService);
  private control: ControlOrientacion | null = null;
  private temporizador = 0;

  readonly activo = signal(false);
  readonly lectura = signal("");

  constructor() {
    // Si la aplicación se destruye con los sensores activos, se sueltan.
    inject(DestroyRef).onDestroy(() => {
      window.clearInterval(this.temporizador);
      this.control?.detener();
    });
  }

  apagar(): void {
    this.control?.detener();
    this.control = null;
    window.clearInterval(this.temporizador);
    this.visorSvc.visor()?.controlPorSensores(false);
    this.activo.set(false);
    this.lectura.set("");
  }

  async alternar(): Promise<void> {
    const visor = this.visorSvc.visor();
    if (!visor) return;
    if (this.control) {
      this.apagar(); // segundo clic: volver al control manual
      return;
    }
    const permiso = await pedirPermisoOrientacion();
    if (permiso === "denied") {
      this.visorSvc.aviso.set("Denegaste el acceso a los sensores. Sigue disponible el control con ratón o dedo.");
      return;
    }
    if (permiso === "no-soportado" || !(await hayOrientacionReal())) {
      this.visorSvc.aviso.set("Este dispositivo no tiene sensores de orientación. Usa el ratón o el dedo para girar el visor.");
      return;
    }
    this.visorSvc.aviso.set("");
    visor.controlPorSensores(true);
    this.control = iniciarControlOrientacion((x, y) => visor.rotarHacia(x, y));
    this.activo.set(true);
    // Mientras los sensores están activos, la lectura en pantalla se refresca cada 150 ms.
    this.temporizador = window.setInterval(() => {
      const { x, y } = visor.rotacionActualGrados();
      this.lectura.set(`rotación X ${x}° · Y ${y}°`);
    }, 150);
  }

  calibrar(): void {
    this.control?.calibrar();
  }
}
