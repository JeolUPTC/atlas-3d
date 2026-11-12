import { ApplicationConfig, provideBrowserGlobalErrorListeners } from "@angular/core";

// Sin zone.js (Angular 22 es «zoneless» por defecto): la pantalla se actualiza cuando cambia una señal.
export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
