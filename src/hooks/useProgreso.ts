// useProgreso — Sesión 43. La capa de IndexedDB (db.ts) sigue igual; el hook la ofrece a los
// componentes: el progreso por modelo, las fichas descargadas y las acciones que los cambian.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  abrirBaseDeDatos, alternarFavorito, guardarNotaDeEstudio, marcarModeloVisto,
  obtenerDescargas, obtenerTodoElProgreso, type ProgresoModelo,
} from "../db";
import { cifrarTexto, derivarClaveDesdeContrasena, descifrarTexto, obtenerOCrearSal } from "../crypto";

export function useProgreso() {
  // La base se abre una sola vez; la promesa se guarda para que cualquier manejador pueda esperarla.
  const dbPromesa = useRef<Promise<IDBDatabase> | null>(null);
  if (dbPromesa.current === null) dbPromesa.current = abrirBaseDeDatos();
  const claveSesion = useRef<CryptoKey | null>(null);

  const [progreso, setProgreso] = useState<Map<string, ProgresoModelo>>(new Map());
  const [descargados, setDescargados] = useState<Set<string>>(new Set());

  const recargar = useCallback(async () => {
    const db = await dbPromesa.current!;
    const [todo, descargas] = await Promise.all([obtenerTodoElProgreso(db), obtenerDescargas(db)]);
    setProgreso(new Map(todo.map((p) => [p.modeloId, p])));
    setDescargados(new Set(descargas.filter((d) => d.estado === "listo").map((d) => d.modeloId)));
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  async function obtenerClave(): Promise<CryptoKey | null> {
    if (claveSesion.current) return claveSesion.current;
    const contrasena = window.prompt("Contraseña para cifrar/descifrar la nota de estudio (la misma cada vez — no se guarda en ningún lado):");
    if (!contrasena) return null;
    claveSesion.current = await derivarClaveDesdeContrasena(contrasena, obtenerOCrearSal());
    return claveSesion.current;
  }

  return {
    dbPromesa: dbPromesa.current,
    progreso,
    descargados,
    recargar,
    async marcarVisto(id: string) {
      await marcarModeloVisto(await dbPromesa.current!, id);
      await recargar();
    },
    async alternarFavorito(id: string) {
      await alternarFavorito(await dbPromesa.current!, id);
      await recargar();
    },
    async guardarNota(id: string, texto: string): Promise<boolean> {
      const clave = await obtenerClave();
      if (!clave) return false;
      await guardarNotaDeEstudio(await dbPromesa.current!, clave, id, texto, cifrarTexto);
      await recargar();
      return true;
    },
    async verNota(id: string) {
      const p = progreso.get(id);
      if (!p?.notaCifrada || !p.notaIv) return;
      const clave = await obtenerClave();
      if (!clave) return;
      try {
        const texto = await descifrarTexto(clave, { cifrado: p.notaCifrada, iv: p.notaIv });
        window.alert(`Nota de estudio de "${id}":\n\n${texto}`);
      } catch {
        window.alert("No se pudo descifrar — la contraseña ingresada no es la correcta.");
      }
    },
  };
}
