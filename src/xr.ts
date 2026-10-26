// xr.ts — realidad aumentada con WebXR (Sesiones 38 y 39).
// Sesión 38: detectar si se puede, pedir la sesión dentro de un clic y cerrarla bien.
// Sesión 39: además se piden las funciones OPCIONALES «hit-test» (encontrar una
// superficie real) y «anchors» (anclar el objeto a ella), y se averigua cuáles
// concedió realmente el navegador para tener un plan B en cada caso.

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

export interface LaboratorioAR {
  nombre: string;
  req: boolean; // hit-test como función requerida, no opcional
  floor: boolean; // espacio de referencia «local-floor» en vez de «local»
  cada1: boolean; // consultar el hit-test en todos los fotogramas
  noanc: boolean; // no pedir «anchors»
}

/** Lee ?lab=req|floor|cada1|noanc|todo. Sin parámetro, todo apagado: la app se comporta normal. */
export function laboratorioAR(): LaboratorioAR {
  let nombre = "";
  try {
    nombre = new URLSearchParams(location.search).get("lab") ?? "";
  } catch {
    nombre = "";
  }
  const todo = nombre === "todo";
  return { nombre, req: todo || nombre === "req", floor: todo || nombre === "floor", cada1: todo || nombre === "cada1", noanc: todo || nombre === "noanc" };
}

/**
 * Pide la sesión AR. DEBE llamarse desde el manejador de un clic: sin gesto del
 * usuario, el navegador la rechaza con SecurityError.
 */
export function pedirSesionAR(overlay: HTMLElement | null): Promise<XRSession> {
  const lab = laboratorioAR();
  const opciones: XRSessionInit & { domOverlay?: { root: Element } } = {
    requiredFeatures: ["local"], // el origen (0,0,0) es donde está el usuario al empezar
    // Todas OPCIONALES: si el dispositivo no las tiene, la sesión se abre igual y la app usa su plan B.
    optionalFeatures: ["dom-overlay", "hit-test", "anchors"],
  };
  // Laboratorio (solo con ?lab=…): variantes para descubrir por qué un dispositivo no da hit-test.
  if (lab.req) {
    opciones.requiredFeatures!.push("hit-test");
    opciones.optionalFeatures = opciones.optionalFeatures!.filter((f) => f !== "hit-test");
  }
  if (lab.floor) opciones.optionalFeatures!.push("local-floor");
  if (lab.noanc) opciones.optionalFeatures = opciones.optionalFeatures!.filter((f) => f !== "anchors");
  if (overlay) opciones.domOverlay = { root: overlay };
  return navigator.xr!.requestSession("immersive-ar", opciones);
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
