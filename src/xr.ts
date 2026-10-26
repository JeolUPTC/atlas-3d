// xr.ts — realidad aumentada con WebXR (Sesiones 38 y 39).
// Sesión 38: detectar si se puede, pedir la sesión dentro de un clic y cerrarla bien.
// Sesión 39: además se piden «hit-test» (encontrar una superficie real; primero como
// función requerida y, si el dispositivo no la ofrece, como opcional) y «anchors»
// (anclar el objeto a ella), y se averigua cuáles concedió realmente el navegador
// para tener un plan B en cada caso.

/** Resultado de preguntar «¿puedo usar AR aquí?». */
export type SoporteAR = "disponible" | "contexto-inseguro" | "sin-webxr" | "sin-ar";

/** Estado de soporte y, además, las comprobaciones una por una (para mostrarlas en pantalla). */
export async function diagnosticarAR(): Promise<{ estado: SoporteAR; lineas: string[] }> {
  const lineas: string[] = [];
  const seguro = window.isSecureContext;
  lineas.push(`Contexto seguro (HTTPS o localhost): ${seguro ? "sí" : "NO"}`);
  if (!seguro) return { estado: "contexto-inseguro", lineas };

  lineas.push(`navigator.xr: ${navigator.xr ? "presente" : "AUSENTE"}`);
  if (!navigator.xr) return { estado: "sin-webxr", lineas };

  try {
    // Responde si el DISPOSITIVO puede abrir ese modo; no pide permiso ni abre nada.
    const ok = await navigator.xr.isSessionSupported("immersive-ar");
    lineas.push(`isSessionSupported("immersive-ar"): ${ok}`);
    return { estado: ok ? "disponible" : "sin-ar", lineas };
  } catch (err) {
    lineas.push(`isSessionSupported("immersive-ar") lanzó: ${err instanceof Error ? err.name : String(err)}`);
    return { estado: "sin-ar", lineas };
  }
}

export async function detectarSoporteAR(): Promise<SoporteAR> {
  return (await diagnosticarAR()).estado;
}

export function mensajeSoporteAR(estado: SoporteAR): string {
  switch (estado) {
    case "disponible":
      return "Este dispositivo puede abrir una sesión de realidad aumentada.";
    case "contexto-inseguro":
      return "La realidad aumentada exige HTTPS o localhost.";
    case "sin-webxr":
      return "Este navegador no ofrece WebXR (por ejemplo, Safari en iPhone o Firefox). El visor 3D sigue funcionando.";
    case "sin-ar":
      return "Este dispositivo no admite realidad aumentada en el navegador (por ejemplo, un computador de escritorio sin el emulador activado).";
  }
}

/**
 * Pide la sesión AR. DEBE llamarse desde el manejador de un clic: sin gesto del
 * usuario, el navegador la rechaza con SecurityError.
 *
 * Primer intento: `hit-test` como función REQUERIDA. Con ella opcional, Chrome en Android
 * concedía la función y creaba la fuente, pero nunca entregaba una superficie; como requerida,
 * el anillo sale. Si el dispositivo no la ofrece (NotSupportedError), se reintenta con todo
 * opcional: la sesión se abre igual y la app usa su plan B.
 */
export async function pedirSesionAR(overlay: HTMLElement | null): Promise<XRSession> {
  const abrir = (requeridas: string[], opcionales: string[]) => {
    const opciones: XRSessionInit & { domOverlay?: { root: Element } } = {
      requiredFeatures: requeridas, // «local»: el origen (0,0,0) es donde está el usuario al empezar
      optionalFeatures: opcionales,
    };
    if (overlay) opciones.domOverlay = { root: overlay };
    return navigator.xr!.requestSession("immersive-ar", opciones);
  };
  try {
    return await abrir(["local", "hit-test"], ["dom-overlay", "anchors"]);
  } catch (error) {
    if ((error as DOMException).name !== "NotSupportedError") throw error;
    return abrir(["local"], ["dom-overlay", "hit-test", "anchors"]);
  }
}

/** Qué funciones opcionales concedió de verdad el navegador en esta sesión. */
export interface CapacidadesAR {
  overlay: boolean; // dom-overlay: botones HTML y gestos de dedos sobre la cámara
  hitTest: boolean; // hit-test: preguntar «¿dónde está la superficie en esta dirección?»
  anclas: boolean; // anchors: fijar un punto del mundo real y que el sistema lo siga corrigiendo
}

/**
 * Pedir una función no garantiza recibirla. `enabledFeatures` lista las concedidas;
 * si el navegador aún no la ofrece, se mira si existen las funciones de la API.
 */
export function capacidadesDe(sesion: XRSession): CapacidadesAR {
  const concedidas = (sesion as XRSession & { enabledFeatures?: string[] }).enabledFeatures;
  const tiene = (nombre: string, respaldo: boolean) => (Array.isArray(concedidas) ? concedidas.includes(nombre) : respaldo);
  return {
    overlay: Boolean(sesion.domOverlayState),
    hitTest: tiene("hit-test", typeof sesion.requestHitTestSource === "function"),
    anclas: tiene("anchors", typeof XRFrame !== "undefined" && "createAnchor" in XRFrame.prototype),
  };
}

export function describirErrorAR(err: unknown): string {
  const nombre = err instanceof Error ? err.name : "";
  switch (nombre) {
    case "NotSupportedError":
      return "Este dispositivo no puede abrir realidad aumentada con las funciones que pide la app.";
    case "SecurityError":
      return "El navegador rechazó la sesión de realidad aumentada: se denegó el permiso o la petición no vino de un toque del usuario.";
    default:
      return "No se pudo iniciar la realidad aumentada. Inténtalo de nuevo.";
  }
}
