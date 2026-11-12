// descargas.ts — descarga de modelos para uso sin conexión (Sesión 37).
// Este módulo lo importan DOS contextos: el Service Worker (cuando el
// navegador dispara la sincronización) y la página (plan B sin Background
// Sync). Como el Atlas pasa por Vite, el código se escribe UNA vez — a
// diferencia del Gestor (Sesión 26), cuyo SW clásico no podía importar módulos.
import { obtenerDescargas, marcarDescargaLista } from "./db";
import type { Ficha } from "./modelos/tipos";
import { BASE_URL } from "./base";

export const ETIQUETA_SYNC = "descargar-modelos";
export const CACHE_MODELOS = "modelos-3d";
// BASE_URL vale «/» en local y «/nombre-del-repo/» en GitHub Pages: nunca escribas rutas absolutas a mano.
export const urlDeModelo = (id: string) => `${BASE_URL}modelos/${id}.json`;

export type AlProgresar = (hechos: number, total: number) => void | Promise<void>;

/**
 * Descarga, una por una, las fichas que están «pendiente». Si una falla LANZA:
 * las anteriores ya quedaron marcadas como «listo» (no se vuelven a pedir) y
 * el navegador reintentará solo las que faltan.
 * Devuelve cuántas se descargaron en esta pasada.
 */
export async function descargarPendientes(db: IDBDatabase, alProgresar: AlProgresar): Promise<number> {
  const todas = await obtenerDescargas(db);
  const total = todas.length;
  let hechos = todas.filter((d) => d.estado === "listo").length;
  const cache = await caches.open(CACHE_MODELOS);
  let descargadas = 0;
  for (const d of todas.filter((x) => x.estado === "pendiente")) {
    // cache: "reload" evita que la caché HTTP del navegador responda por la red.
    const resp = await fetch(urlDeModelo(d.modeloId), { cache: "reload" });
    if (!resp.ok) throw new Error(`${d.modeloId}: el servidor respondió ${resp.status}`);
    await cache.put(urlDeModelo(d.modeloId), resp);
    await marcarDescargaLista(db, d.modeloId);
    hechos++;
    descargadas++;
    await alProgresar(hechos, total);
  }
  return descargadas;
}

/**
 * Sesión 40: lee la ficha ampliada de un modelo. Primero mira la caché (sirve sin conexión);
 * si no está, la pide a la red; si tampoco hay red, devuelve null y la app usa solo lo que
 * viaja en el código (el resumen de cada pieza).
 */
export async function leerFicha(id: string): Promise<Ficha | null> {
  try {
    const cache = await caches.open(CACHE_MODELOS);
    const guardada = await cache.match(urlDeModelo(id));
    if (guardada) return (await guardada.json()) as Ficha;
  } catch {
    /* sin Cache Storage: se intenta la red */
  }
  try {
    const resp = await fetch(urlDeModelo(id));
    if (resp.ok) return (await resp.json()) as Ficha;
  } catch {
    /* sin red */
  }
  return null;
}
