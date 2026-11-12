// build.mjs — Sesión 44. Un solo comando para compilar todo: npm run build [-- --base-href=/mi-repo/]
//   1) ng build         → la app (index.html, JavaScript, CSS) en dist/
//   2) tsc (sw)         → comprueba los tipos de src/sw.ts (el compilador de Angular no lo ve)
//   3) build-sw.mjs     → empaqueta el Service Worker propio y le inyecta la lista de precaché
// Con Vite (Sesiones 37-43) vite-plugin-pwa hacía los pasos 2 y 3 dentro de «vite build».
import { spawnSync } from "node:child_process";

const argumentos = process.argv.slice(2); // se pasan a «ng build»
function ejecutar(orden, args) {
  const r = spawnSync(orden, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
ejecutar("npx", ["ng", "build", ...argumentos]);
ejecutar("npx", ["tsc", "-p", "tsconfig.sw.json"]);
ejecutar("node", ["scripts/build-sw.mjs"]);
