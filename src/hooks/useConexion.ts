// useConexion — Sesión 43. Convierte conexion.ts (eventos online/offline) en un valor de React:
// el texto de la banda, o null si no hay banda que mostrar.
import { useEffect, useState } from "react";
import { iniciarConexion } from "../conexion";

export function useConexion(): string | null {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    let estuvoSinConexion = false;
    let temporizador: number | undefined;
    const dejarDeEscuchar = iniciarConexion((enLinea) => {
      window.clearTimeout(temporizador);
      if (!enLinea) {
        estuvoSinConexion = true;
        setTexto("Sin conexión: los modelos y las fichas descargadas siguen disponibles.");
      } else if (estuvoSinConexion) {
        estuvoSinConexion = false;
        setTexto("Volvió la conexión.");
        temporizador = window.setTimeout(() => setTexto(null), 3000);
      } else {
        setTexto(null);
      }
    });
    // La limpieza: sin ella, cada montaje (y el doble montaje de StrictMode) dejaría un oyente más.
    return () => {
      dejarDeEscuchar();
      window.clearTimeout(temporizador);
    };
  }, []);

  return texto;
}
