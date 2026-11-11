// OverlayAR — Sesión 43. Lo que se dibuja encima de la cámara durante la sesión de AR.
// WebXR pide UN elemento HTML como «dom-overlay»: debe existir antes de pedir la sesión y no
// reemplazarse mientras dura. Por eso React lo monta una vez y solo cambia su texto.
import { useEffect, useRef, type RefObject } from "react";

interface Props {
  raiz: RefObject<HTMLDivElement | null>;
  ayuda: string;
  datos: string;
  pieza: string;
  alRecorrer: (paso: number) => void;
  alSalir: () => void;
}

export function OverlayAR({ raiz, ayuda, datos, pieza, alRecorrer, alSalir }: Props) {
  const salir = useRef<HTMLButtonElement>(null);
  const ant = useRef<HTMLButtonElement>(null);
  const sig = useRef<HTMLButtonElement>(null);

  // Un toque sobre un botón del overlay NO debe contar como «tocar para colocar»: el navegador avisa
  // con `beforexrselect` y basta cancelarlo. React no conoce ese evento, así que se enlaza a mano.
  useEffect(() => {
    const botones = [salir.current, ant.current, sig.current].filter((b): b is HTMLButtonElement => b !== null);
    const cancelar = (e: Event) => e.preventDefault();
    botones.forEach((b) => b.addEventListener("beforexrselect", cancelar));
    return () => botones.forEach((b) => b.removeEventListener("beforexrselect", cancelar));
  }, []);

  return (
    <div id="xr-overlay" className="xr-overlay" ref={raiz}>
      <p id="xr-estado">{ayuda}</p>
      <p id="xr-datos" className="xr-datos">{datos}</p>
      <div className="xr-piezas">
        <button type="button" id="btn-pieza-ant" aria-label="Pieza anterior" ref={ant} onClick={() => alRecorrer(-1)}>◀</button>
        <p id="xr-pieza" className="xr-pieza">{pieza}</p>
        <button type="button" id="btn-pieza-sig" aria-label="Pieza siguiente" ref={sig} onClick={() => alRecorrer(1)}>▶</button>
      </div>
      <button type="button" id="btn-salir-ar" ref={salir} onClick={alSalir}>Salir de AR</button>
    </div>
  );
}
