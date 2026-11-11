// useCamara — Sesión 43. La cámara como fondo del visor (Sesión 36): se pide dentro del clic,
// y se apaga sola si la persona sale de la página.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Visor } from "../visor";
import { describirErrorCamara, detenerCamaraDeFondo, iniciarCamaraDeFondo } from "../camara";

export function useCamara(visor: Visor | null, video: RefObject<HTMLVideoElement | null>, avisar: (texto: string) => void) {
  const stream = useRef<MediaStream | null>(null);
  const [activa, setActiva] = useState(false);

  const apagar = useCallback(() => {
    if (video.current) detenerCamaraDeFondo(video.current, stream.current);
    stream.current = null;
    visor?.fondoTransparente(false);
    setActiva(false);
  }, [visor, video]);

  async function alternar() {
    if (stream.current) {
      apagar();
      return;
    }
    avisar("");
    try {
      // El permiso se pide AQUÍ, dentro del clic — no al cargar la página.
      stream.current = await iniciarCamaraDeFondo(video.current!);
    } catch (err) {
      avisar(describirErrorCamara(err));
      return;
    }
    visor?.fondoTransparente(true);
    setActiva(true);
  }

  // Una cámara abierta en segundo plano gasta batería y deja el LED encendido.
  useEffect(() => {
    const alCambiarVisibilidad = () => {
      if (document.hidden && stream.current) {
        apagar();
        avisar("La cámara se apagó al salir de la página. Vuelve a activarla cuando quieras.");
      }
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, [apagar, avisar]);

  return { activa, alternar, apagar };
}
