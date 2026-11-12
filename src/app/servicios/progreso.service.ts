// ProgresoService — Sesión 44. La capa de IndexedDB (db.ts) sigue igual; el servicio la ofrece a los
// componentes: el progreso por modelo, las fichas descargadas y las acciones que los cambian.
// Un servicio es una clase con estado que Angular crea UNA vez y entrega a quien la pida (inject).
import { Injectable, signal } from "@angular/core";
import {
  abrirBaseDeDatos, alternarFavorito, guardarNotaDeEstudio, marcarModeloVisto,
  obtenerDescargas, obtenerTodoElProgreso, type ProgresoModelo,
} from "../../db";
import { cifrarTexto, derivarClaveDesdeContrasena, descifrarTexto, obtenerOCrearSal } from "../../crypto";

@Injectable({ providedIn: "root" })
export class ProgresoService {
  // La base se abre una sola vez; la promesa se guarda para que cualquier manejador pueda esperarla.
  readonly dbPromesa: Promise<IDBDatabase> = abrirBaseDeDatos();
  private claveSesion: CryptoKey | null = null;

  readonly progreso = signal<Map<string, ProgresoModelo>>(new Map());
  readonly descargados = signal<Set<string>>(new Set());

  constructor() {
    void this.recargar();
  }

  async recargar(): Promise<void> {
    const db = await this.dbPromesa;
    const [todo, descargas] = await Promise.all([obtenerTodoElProgreso(db), obtenerDescargas(db)]);
    this.progreso.set(new Map(todo.map((p) => [p.modeloId, p])));
    this.descargados.set(new Set(descargas.filter((d) => d.estado === "listo").map((d) => d.modeloId)));
  }

  private async obtenerClave(): Promise<CryptoKey | null> {
    if (this.claveSesion) return this.claveSesion;
    const contrasena = window.prompt("Contraseña para cifrar/descifrar la nota de estudio (la misma cada vez — no se guarda en ningún lado):");
    if (!contrasena) return null;
    this.claveSesion = await derivarClaveDesdeContrasena(contrasena, obtenerOCrearSal());
    return this.claveSesion;
  }

  async marcarVisto(id: string): Promise<void> {
    await marcarModeloVisto(await this.dbPromesa, id);
    await this.recargar();
  }

  async alternarFavorito(id: string): Promise<void> {
    await alternarFavorito(await this.dbPromesa, id);
    await this.recargar();
  }

  async guardarNota(id: string, texto: string): Promise<boolean> {
    const clave = await this.obtenerClave();
    if (!clave) return false;
    await guardarNotaDeEstudio(await this.dbPromesa, clave, id, texto, cifrarTexto);
    await this.recargar();
    return true;
  }

  async verNota(id: string): Promise<void> {
    const p = this.progreso().get(id);
    if (!p?.notaCifrada || !p.notaIv) return;
    const clave = await this.obtenerClave();
    if (!clave) return;
    try {
      const texto = await descifrarTexto(clave, { cifrado: p.notaCifrada, iv: p.notaIv });
      window.alert(`Nota de estudio de "${id}":\n\n${texto}`);
    } catch {
      window.alert("No se pudo descifrar — la contraseña ingresada no es la correcta.");
    }
  }
}
