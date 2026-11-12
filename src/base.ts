// base.ts — Sesión 44. Ruta base de la app: «/» en local, «/nombre-del-repo/» en GitHub Pages.
// Vite la ofrecía como import.meta.env.BASE_URL. Angular no define esa variable: la ruta base se lee
// de donde Angular la fija, la etiqueta <base href> del index.html (ng build --base-href=...).
// Funciona en la página (document.baseURI) y en el Service Worker (el alcance con que se registró).
const g = globalThis as unknown as { document?: { baseURI: string }; registration?: { scope: string } };
export const BASE_URL = new URL(g.document?.baseURI ?? g.registration!.scope).pathname;
