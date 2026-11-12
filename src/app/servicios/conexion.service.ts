// ConexionService — Sesión 44. Convierte conexion.ts (eventos online/offline) en una señal:
// el texto de la banda, o null si no hay banda que mostrar. (En React era el hook useConexion.)
import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { iniciarConexion } from "../../conexion";

@Injectable({ providedIn: "root" })
export class ConexionService {
  readonly texto = signal<string | null>(null);

  constructor() {
    let estuvoSinConexion = false;
    let temporizador: number | undefined;
    const dejarDeEscuchar = iniciarConexion((enLinea) => {
      window.clearTimeout(temporizador);
      if (!enLinea) {
        estuvoSinConexion = true;
        this.texto.set("Sin conexión: los modelos y las fichas descargadas siguen disponibles.");
      } else if (estuvoSinConexion) {
        estuvoSinConexion = false;
        this.texto.set("Volvió la conexión.");
        temporizador = window.setTimeout(() => this.texto.set(null), 3000);
      } else {
        this.texto.set(null);
      }
    });
    // La limpieza vive en DestroyRef: se ejecuta cuando Angular destruye este servicio.
    inject(DestroyRef).onDestroy(() => {
      dejarDeEscuchar();
      window.clearTimeout(temporizador);
    });
  }
}
