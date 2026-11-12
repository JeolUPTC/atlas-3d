// Punto de entrada — Sesión 44. Hasta la Sesión 42 era main.ts: 649 líneas que buscaban elementos
// con querySelector y les enganchaban oyentes. Ahora solo le dice a Angular qué componente arrancar.
import { bootstrapApplication } from "@angular/platform-browser";
import { isDevMode } from "@angular/core";
import { App } from "./app/app";
import { appConfig } from "./app/app.config";

bootstrapApplication(App, appConfig)
  .then((app) => {
    // Solo en desarrollo: un asa para que las pruebas puedan destruir la aplicación y comprobar la limpieza.
    if (isDevMode()) (window as unknown as { __atlas: { destruir: () => void } }).__atlas = { destruir: () => app.destroy() };
  })
  .catch((err) => console.error(err));
