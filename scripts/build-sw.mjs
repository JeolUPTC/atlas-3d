// build-sw.mjs — Sesión 44. Empaqueta src/sw.ts (esbuild) y le inyecta el precaché (workbox-build).
// Es lo mismo que hacía vite-plugin-pwa con strategies:"injectManifest" en las Sesiones 37-43:
//   • esbuild junta sw.ts con los módulos de Workbox y con db.ts / descargas.ts en UN archivo clásico;
//   • injectManifest recorre dist/, arma la lista de archivos y la escribe donde está self.__WB_MANIFEST.
import { build } from "esbuild";
import { injectManifest } from "workbox-build";
import { rmSync } from "node:fs";

const temporal = "dist/.sw-empaquetado.js";
await build({
  entryPoints: ["src/sw.ts"],
  outfile: temporal,
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
});

const { count, size, warnings } = await injectManifest({
  swSrc: temporal,
  swDest: "dist/sw.js",
  globDirectory: "dist",
  globPatterns: ["**/*.{html,js,css,png,json}"],
  // Las fichas de modelos NO se precachean: se descargan bajo demanda (la descarga «voluntaria» de la Sesión 37).
  // Tampoco el propio Service Worker ni su archivo temporal.
  globIgnores: ["modelos/**", "sw.js", ".sw-empaquetado.js"],
});
rmSync(temporal);
warnings.forEach((w) => console.warn(w));
console.log(`\nPWA · Service Worker propio\nprecache  ${count} entries (${(size / 1024).toFixed(2)} KiB)\n  dist/sw.js`);
