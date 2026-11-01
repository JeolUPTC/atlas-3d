// conexion.ts — estado de la conexión (Sesión 41).
// navigator.onLine dice si el dispositivo TIENE una red (wifi o datos conectados), no si esa
// red llega a Internet: «true» puede ser un wifi sin salida; «false» sí es fiable (sin red).
// Por eso el aviso habla de «sin conexión» solo cuando el navegador lo afirma, y nunca promete
// que «en línea» signifique que el servidor responde.

export function hayConexion(): boolean {
  return navigator.onLine;
}

/** Llama a «alCambiar» al arrancar y cada vez que cambie. Devuelve cómo dejar de escuchar. */
export function iniciarConexion(alCambiar: (enLinea: boolean) => void): () => void {
  const alSubir = () => alCambiar(true);
  const alBajar = () => alCambiar(false);
  window.addEventListener("online", alSubir);
  window.addEventListener("offline", alBajar);
  alCambiar(navigator.onLine);
  return () => {
    window.removeEventListener("online", alSubir);
    window.removeEventListener("offline", alBajar);
  };
}
