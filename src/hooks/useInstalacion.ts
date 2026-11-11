// useInstalacion — Sesión 43. El estado de la instalación vive FUERA de React (en instalar.ts:
// el evento guardado es una variable del módulo). useSyncExternalStore es la forma de React
// de leer un valor externo y volver a dibujar cuando cambia.
import { useSyncExternalStore } from "react";
import { estadoInstalacion, iniciarInstalacion, instalacionRechazada, pedirInstalacion } from "../instalar";

export const TEXTO_INSTALACION = {
  instalada: "✓ Estás usando Atlas 3D como app instalada.",
  recienInstalada: "✓ Instalada. Ábrela desde su icono en la pantalla de inicio.",
  instalable: "Puedes instalarla: se abre a pantalla completa, desde su icono, y funciona sin conexión.",
  ios: "En iPhone y iPad no hay botón: en Safari toca Compartir y luego «Añadir a pantalla de inicio».",
  noDisponible: "Este navegador no ofrece instalar desde la página. Si ya la instalaste, ábrela desde su icono; si no, usa el menú del navegador → «Instalar app».",
  rechazada: "Cancelaste la instalación. Chrome decide cuándo volver a ofrecerla; mientras tanto, usa el menú ⋮ → «Instalar app».",
};

// Declaradas fuera del hook para que su identidad no cambie entre dibujos.
const suscribir = (avisar: () => void) => iniciarInstalacion(avisar);
const foto = () => `${estadoInstalacion()}|${instalacionRechazada()}`;

export function useInstalacion() {
  const [estado, rechazada] = useSyncExternalStore(suscribir, foto).split("|");
  const texto =
    estado === "instalada" ? TEXTO_INSTALACION.instalada
    : estado === "recien-instalada" ? TEXTO_INSTALACION.recienInstalada
    : estado === "instalable" ? TEXTO_INSTALACION.instalable
    : estado === "ios" ? TEXTO_INSTALACION.ios
    : rechazada === "true" ? TEXTO_INSTALACION.rechazada
    : TEXTO_INSTALACION.noDisponible;
  return { instalable: estado === "instalable", texto, pedir: pedirInstalacion };
}
