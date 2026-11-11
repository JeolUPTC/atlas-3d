// instalar.ts — experiencia de instalación del Atlas 3D (Sesión 41).
// Chrome decide CUÁNDO una PWA es instalable y avisa con el evento «beforeinstallprompt».
// Ese evento se puede guardar y usar más tarde, dentro de un clic del usuario: así el
// botón «Instalar» aparece solo cuando instalar es posible, y no antes.

/** El evento no está en los tipos estándar de TypeScript: se declara lo que se usa. */
interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export type EstadoInstalacion =
  | "instalada" // ya se abre como app (sin barra del navegador)
  | "recien-instalada" // se instaló en esta visita: la pestaña sigue abierta, la app se abre desde su icono
  | "instalable" // hay un evento guardado: el botón puede funcionar
  | "ios" // Safari de iPhone/iPad: no hay evento, la instalación es manual
  | "no-disponible"; // el navegador no ofrece instalación desde la página (o ya se usó el evento)

let evento: EventoInstalacion | null = null;
let rechazada = false;
let recienInstalada = false;
let avisar: () => void = () => {};

/** ¿La página se está mostrando como app instalada? */
export function estaInstalada(): boolean {
  // Android/escritorio: el modo de visualización del manifest. iOS: la propiedad no estándar «standalone».
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Safari de iPhone/iPad (el iPad reciente se presenta como Mac: se distingue por la pantalla táctil). */
export function esIOS(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function estadoInstalacion(): EstadoInstalacion {
  if (estaInstalada()) return "instalada";
  if (recienInstalada) return "recien-instalada";
  if (evento) return "instalable";
  if (esIOS()) return "ios";
  return "no-disponible";
}

/** ¿El usuario canceló el diálogo en esta visita? Cambia el texto que se muestra. */
export function instalacionRechazada(): boolean {
  return rechazada;
}

/** Empieza a escuchar. «alCambiar» se llama cada vez que el estado puede haber cambiado. Devuelve cómo dejar de escuchar. */
export function iniciarInstalacion(alCambiar: () => void): () => void {
  avisar = alCambiar;
  const alOfrecer = (e: Event) => {
    // Sin esto, Chrome móvil muestra su propia barrita de «Instalar». Se guarda para usarlo en NUESTRO botón.
    e.preventDefault();
    evento = e as EventoInstalacion;
    rechazada = false;
    avisar();
  };
  const alInstalar = () => {
    evento = null; // ya no sirve
    recienInstalada = true;
    avisar();
  };
  // Cambiar entre pestaña del navegador y ventana de app también cambia el modo de visualización.
  const modo = window.matchMedia("(display-mode: standalone)");
  const alCambiarModo = () => avisar();
  window.addEventListener("beforeinstallprompt", alOfrecer);
  window.addEventListener("appinstalled", alInstalar);
  modo.addEventListener("change", alCambiarModo);
  avisar();
  // Sesión 43: en React todo efecto que empieza algo debe saber deshacerlo.
  return () => {
    window.removeEventListener("beforeinstallprompt", alOfrecer);
    window.removeEventListener("appinstalled", alInstalar);
    modo.removeEventListener("change", alCambiarModo);
    avisar = () => {};
  };
}

/** Abre el diálogo del sistema. Solo funciona dentro de un clic y una sola vez por evento. */
export async function pedirInstalacion(): Promise<"accepted" | "dismissed" | "no-disponible"> {
  if (!evento) return "no-disponible";
  const guardado = evento;
  evento = null; // un evento solo se puede usar una vez: se suelta antes de esperar la respuesta
  await guardado.prompt();
  const { outcome } = await guardado.userChoice;
  rechazada = outcome === "dismissed";
  avisar();
  return outcome;
}
