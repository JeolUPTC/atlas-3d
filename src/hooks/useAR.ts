// useAR — Sesión 43. La realidad aumentada de las Sesiones 38-42 (xr.ts y visor.ts no cambian):
// ¿se puede?, entrar, el texto del overlay y la salida. Todo lo imperativo (la sesión WebXR, el
// render) sigue en el visor; el hook solo guarda lo que la pantalla necesita mostrar.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { EstadoAR, Visor } from "../visor";
import { describirErrorAR, diagnosticarAR, mensajeSoporteAR, pedirSesionAR } from "../xr";
import { describirRastro, leerRastro, PASO_FINAL } from "../rastro";

// Texto de ayuda sobre la cámara según en qué punto va la colocación.
function ayudaAR(e: EstadoAR): string {
  if (!e.hitTest) return "Este dispositivo no ofrece hit-test: el modelo está a 1,5 m delante. Toca para traerlo delante de ti.";
  switch (e.fase) {
    case "buscando":
      return e.sinSuperficie
        ? "No encuentro superficies. Prueba con una zona con textura y buena luz, o toca la pantalla para colocar el modelo delante de ti."
        : "Mueve el teléfono despacio hasta ver el anillo verde sobre una superficie.";
    case "listo":
      return "Toca la pantalla para colocar el modelo.";
    case "colocado":
      return e.overlay
        ? "Arrastra para moverlo, gira con dos dedos, pellizca para el tamaño. Toca otro punto para recolocarlo."
        : "Modelo colocado. Toca otro punto para recolocarlo.";
  }
}

function datosAR(e: EstadoAR): string {
  const si = (v: boolean) => (v ? "sí" : "no");
  const { x, y, z } = e.posicion;
  const pos = e.fase === "colocado" ? `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) m` : "—";
  return (
    `hit-test: ${si(e.hitTest)} · anclas: ${si(e.anclas)} · anclado: ${si(e.anclado)} · ` +
    `fase: ${e.fase} · escala: ${e.escala.toFixed(2)} · giro: ${e.giroGrados}° · pos: ${pos} · ` +
    `consultas: ${e.consultas} · resultados: ${e.resultados} · poses: ${e.impactos}`
  );
}

// Cada cambio del texto del overlay obliga al navegador a volver a dibujarlo encima de la cámara,
// y eso cuesta. Por eso: (1) solo se actualiza si el texto cambió y (2) como máximo cada 200 ms
// (los gestos avisan decenas de veces por segundo). En React, (1) lo hace la comparación del estado.
const INTERVALO_OVERLAY_MS = 200;

interface Opciones {
  visor: Visor | null;
  overlay: RefObject<HTMLElement | null>;
  avisar: (texto: string) => void;
  /** La cámara del navegador y la sesión AR no pueden usarse a la vez; tampoco los sensores. */
  antesDeEntrar: () => void;
}

export function useAR({ visor, overlay, avisar, antesDeEntrar }: Opciones) {
  const sesion = useRef<XRSession | null>(null);
  const [disponible, setDisponible] = useState(false);
  const [enSesion, setEnSesion] = useState(false);
  const [estado, setEstado] = useState("Comprobando realidad aumentada…");
  const [diagnostico, setDiagnostico] = useState("");
  const [diagAbierto, setDiagAbierto] = useState(false);
  const [textos, setTextos] = useState({ ayuda: "Sesión de realidad aumentada activa", datos: "" });

  // ¿Se puede? El botón solo se habilita si la respuesta es «sí». Se pregunta al cargar, al pulsar
  // «Comprobar de nuevo» y cuando el navegador avisa de que cambió el dispositivo XR.
  const comprobar = useCallback(async () => {
    const { estado: soporte, lineas } = await diagnosticarAR();
    setEstado(mensajeSoporteAR(soporte));
    setDiagnostico([...lineas, sesion.current ? "Sesión de AR en curso." : describirRastro()].join("\n"));
    if (!sesion.current) setDisponible(soporte === "disponible");
    const rastro = leerRastro();
    // Si no se puede, el diagnóstico se muestra abierto para ver qué comprobación falló.
    setDiagAbierto(soporte !== "disponible" || (!sesion.current && rastro !== null && rastro.paso !== PASO_FINAL));
  }, []);

  useEffect(() => {
    void comprobar();
    const alCambiar = () => void comprobar();
    navigator.xr?.addEventListener("devicechange", alCambiar);
    return () => navigator.xr?.removeEventListener("devicechange", alCambiar);
  }, [comprobar]);

  // Throttle del overlay.
  const ultimoPintado = useRef(0);
  const pendiente = useRef<EstadoAR | null>(null);
  const temporizador = useRef(0);

  const pintar = useCallback((e: EstadoAR) => {
    const ayuda = ayudaAR(e);
    const datos = datosAR(e);
    // Mismo texto: se devuelve el mismo objeto y React no vuelve a dibujar nada.
    setTextos((t) => (t.ayuda === ayuda && t.datos === datos ? t : { ayuda, datos }));
  }, []);

  const mostrar = useCallback(
    (e: EstadoAR) => {
      if (performance.now() - ultimoPintado.current >= INTERVALO_OVERLAY_MS) {
        ultimoPintado.current = performance.now();
        pintar(e);
        return;
      }
      pendiente.current = e; // se pintará el último estado cuando venza el intervalo
      if (temporizador.current) return;
      temporizador.current = window.setTimeout(() => {
        temporizador.current = 0;
        ultimoPintado.current = performance.now();
        if (pendiente.current) pintar(pendiente.current);
        pendiente.current = null;
      }, INTERVALO_OVERLAY_MS);
    },
    [pintar]
  );

  async function entrar() {
    if (!visor) return;
    avisar("");
    antesDeEntrar();
    try {
      // La petición ocurre DENTRO del clic: es el «gesto del usuario» que exige WebXR.
      const nueva = await pedirSesionAR(overlay.current);
      sesion.current = nueva;
      setEnSesion(true);
      const concedido = await visor.entrarEnAR(nueva, {
        overlay: overlay.current!,
        alCambiar: mostrar,
        alTerminar: () => {
          sesion.current = null;
          setEnSesion(false);
          setEstado("La sesión de realidad aumentada terminó.");
        },
      });
      // Alguna función puede haberse pedido como opcional; aquí se ve cuáles se concedieron de verdad.
      const faltan = [!concedido.overlay && "dom-overlay", !concedido.hitTest && "hit-test", !concedido.anclas && "anchors"].filter(Boolean);
      setEstado(
        faltan.length
          ? `Sesión de realidad aumentada activa. El navegador no concedió: ${faltan.join(", ")}.`
          : "Sesión de realidad aumentada activa con hit-test, anclas y botones sobre la cámara."
      );
    } catch (err) {
      sesion.current?.end().catch(() => {});
      sesion.current = null;
      setEnSesion(false);
      avisar(describirErrorAR(err));
    }
  }

  return {
    puedeEntrar: disponible && !enSesion,
    estado,
    diagnostico,
    diagAbierto,
    setDiagAbierto,
    textos,
    entrar,
    comprobar,
    salir: () => void sesion.current?.end(),
  };
}
